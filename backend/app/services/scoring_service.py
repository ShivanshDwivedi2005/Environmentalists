from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import AdministrativeRegion, Report, Cleanup, ScoreSnapshot

SEVERITY_WEIGHTS = {
    "CRITICAL": 20.0,
    "HIGH": 12.0,
    "MEDIUM": 6.0,
    "LOW": 3.0
}

class ScoringService:
    @classmethod
    def calculate_region_score(cls, db: Session, region_id: str) -> Dict[str, Any]:
        """
        Calculates deterministic cleanliness score for an administrative region.
        If the region has subregions, aggregates them using population and area weights.
        """
        region = db.query(AdministrativeRegion).filter(AdministrativeRegion.id == region_id).first()
        if not region:
            return {"score": 100.0, "penalty": 0.0, "bonus": 0.0}

        now = datetime.now(timezone.utc)
        child_regions = db.query(AdministrativeRegion).filter(AdministrativeRegion.parent_id == region_id).all()

        if child_regions:
            # Hierarchical rollup
            total_weight = 0.0
            weighted_score_sum = 0.0
            total_active_reports = 0
            total_cleanups = 0

            for child in child_regions:
                child_result = cls.calculate_region_score(db, child.id)
                child_score = child_result["score"]
                total_active_reports += child_result["active_reports_count"]
                total_cleanups += child_result["verified_cleanups_count"]

                # Weight by combined population & area factor
                weight = max(1.0, (child.population / 10000.0) + (child.area_sq_km / 2.0))
                weighted_score_sum += (child_score * weight)
                total_weight += weight

            final_score = round(weighted_score_sum / total_weight, 1) if total_weight > 0 else 100.0
            
            # Update region model
            region.cleanliness_score = final_score
            db.commit()

            return {
                "region_id": region.id,
                "region_name": region.name,
                "region_code": region.code,
                "region_type": region.region_type,
                "score": final_score,
                "active_reports_count": total_active_reports,
                "verified_cleanups_count": total_cleanups,
                "penalty_points": 0.0,
                "cleanup_bonus": 0.0,
                "is_leaf": False
            }

        # Leaf region (Ward or Village)
        active_reports = db.query(Report).filter(
            Report.administrative_region_id == region_id,
            Report.status.in_(["REPORTED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "CLEANING_IN_PROGRESS", "REOPENED"]),
            Report.is_duplicate == False
        ).all()

        total_penalty = 0.0
        for report in active_reports:
            base_weight = SEVERITY_WEIGHTS.get(report.severity, 6.0)
            confidence = max(0.5, report.ai_confidence or 0.8)
            
            # Age decay: older open reports penalize more
            report_age_days = (now - report.created_at.replace(tzinfo=timezone.utc)).total_seconds() / 86400.0
            age_decay = 1.0 + min(1.0, (report_age_days / 30.0) * 0.5)

            penalty = base_weight * confidence * age_decay
            total_penalty += penalty

        # Verified cleanups in last 90 days provide positive recovery
        ninety_days_ago = now - timedelta(days=90)
        verified_cleanups = db.query(Cleanup).join(Report).filter(
            Report.administrative_region_id == region_id,
            Cleanup.status == "VERIFIED",
            Cleanup.verified_at >= ninety_days_ago
        ).all()

        total_bonus = 0.0
        for cleanup in verified_cleanups:
            delta = cleanup.ai_cleanliness_delta or 0.7
            total_bonus += (10.0 * delta)

        # Cap bonus so dirty areas cannot buy high scores through repetitive cleanups
        capped_bonus = min(25.0, total_bonus)

        # Raw score calculation
        raw_score = 100.0 - total_penalty + capped_bonus
        final_score = round(max(0.0, min(100.0, raw_score)), 1)

        # Update region cleanliness score
        region.cleanliness_score = final_score

        # Save snapshot
        snapshot = ScoreSnapshot(
            administrative_region_id=region.id,
            score=final_score,
            active_reports_count=len(active_reports),
            verified_cleanups_count=len(verified_cleanups),
            penalty_score=round(total_penalty, 2),
            bonus_score=round(capped_bonus, 2)
        )
        db.add(snapshot)
        db.commit()

        return {
            "region_id": region.id,
            "region_name": region.name,
            "region_code": region.code,
            "region_type": region.region_type,
            "score": final_score,
            "active_reports_count": len(active_reports),
            "verified_cleanups_count": len(verified_cleanups),
            "penalty_points": round(total_penalty, 2),
            "cleanup_bonus": round(capped_bonus, 2),
            "is_leaf": True
        }

    @classmethod
    def recompute_all_scores(cls, db: Session):
        """Recomputes all regions in bottom-up hierarchical order."""
        # Order by length of parent path / region type: WARD -> TALUKA -> DISTRICT -> STATE -> COUNTRY
        types_order = ["WARD", "TALUKA", "DISTRICT", "STATE", "COUNTRY"]
        for r_type in types_order:
            regions = db.query(AdministrativeRegion).filter(AdministrativeRegion.region_type == r_type).all()
            for r in regions:
                cls.calculate_region_score(db, r.id)


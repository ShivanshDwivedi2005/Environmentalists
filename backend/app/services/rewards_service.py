from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import User, PointTransaction, Report, Cleanup

class RewardsService:
    POINTS_POLICY = {
        "REPORT_VERIFIED": 25,
        "CLEANUP_VERIFIED": 100,
        "VOLUNTEER_TASK": 50,
        "HIGH_QUALITY_EVIDENCE": 15
    }

    @classmethod
    def award_points(
        cls,
        db: Session,
        user_id: str,
        points_delta: int,
        reason: str,
        reference_type: str,
        reference_id: str
    ) -> Dict[str, Any]:
        """
        Idempotently awards points to a user.
        Guarantees that duplicate events do not create multiple awards.
        """
        idempotency_key = f"{reference_type}:{reference_id}:{user_id}"

        # 1. Check if already awarded
        existing = db.query(PointTransaction).filter(
            PointTransaction.idempotency_key == idempotency_key
        ).first()

        if existing:
            return {
                "awarded": False,
                "duplicate_prevented": True,
                "message": "Points already awarded for this contribution.",
                "transaction_id": existing.id,
                "points_delta": 0,
                "current_points": existing.user.cached_points if existing.user else 0
            }

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"awarded": False, "error": "User not found"}

        # 2. Record immutable transaction in ledger
        tx = PointTransaction(
            user_id=user_id,
            points_delta=points_delta,
            reason=reason,
            reference_type=reference_type,
            reference_id=reference_id,
            idempotency_key=idempotency_key
        )
        db.add(tx)

        # 3. Update user cached points
        user.cached_points += points_delta
        db.commit()
        db.refresh(tx)

        return {
            "awarded": True,
            "duplicate_prevented": False,
            "message": f"Successfully awarded {points_delta} points.",
            "transaction_id": tx.id,
            "points_delta": points_delta,
            "current_points": user.cached_points
        }

    @classmethod
    def reverse_points(
        cls,
        db: Session,
        user_id: str,
        points_to_deduct: int,
        reason: str,
        reference_type: str,
        reference_id: str
    ) -> Dict[str, Any]:
        """Creates a compensatory negative entry in the ledger."""
        reversal_key = f"REVERSAL:{reference_type}:{reference_id}:{user_id}"
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"reversed": False, "error": "User not found"}

        tx = PointTransaction(
            user_id=user_id,
            points_delta=-abs(points_to_deduct),
            reason=f"REVERSAL: {reason}",
            reference_type=f"REVERSAL_{reference_type}",
            reference_id=reference_id,
            idempotency_key=reversal_key
        )
        db.add(tx)
        user.cached_points = max(0, user.cached_points - abs(points_to_deduct))
        db.commit()

        return {
            "reversed": True,
            "deducted": points_to_deduct,
            "current_points": user.cached_points
        }

    @classmethod
    def get_user_stats(cls, db: Session, user_id: str) -> Dict[str, Any]:
        """Retrieves points balance, earned badges, and transaction history."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}

        reports_count = db.query(Report).filter(
            Report.reporter_id == user_id,
            Report.status.in_(["VERIFIED", "ASSIGNED", "CLEANING_IN_PROGRESS", "CLEANED_AND_VERIFIED"])
        ).count()

        cleanups_count = db.query(Cleanup).filter(
            Cleanup.organizer_id == user_id,
            Cleanup.status == "VERIFIED"
        ).count()

        badges = ["Eco Scout"]
        if reports_count >= 5:
            badges.append("Pollution Detective")
        if cleanups_count >= 1:
            badges.append("Ground Cleaner")
        if cleanups_count >= 5:
            badges.append("Community Guardian")
        if user.cached_points >= 250:
            badges.append("Eco Champion")

        transactions = db.query(PointTransaction).filter(
            PointTransaction.user_id == user_id
        ).order_by(PointTransaction.created_at.desc()).limit(20).all()

        return {
            "user_id": user.id,
            "total_points": user.cached_points,
            "reports_submitted": reports_count,
            "cleanups_completed": cleanups_count,
            "badges": badges,
            "transactions": transactions
        }


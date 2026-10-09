from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AdministrativeRegion, Report, Cleanup, User
from app.schemas import ScoreSummaryOut, LeaderboardItem, RegionOut
from app.security import get_current_user
from app.services.scoring_service import ScoringService

router = APIRouter(prefix="/scores", tags=["Cleanliness Scores"])

@router.get("/summary", response_model=List[RegionOut])
def get_all_regions_summary(db: Session = Depends(get_db)):
    regions = db.query(AdministrativeRegion).order_by(AdministrativeRegion.cleanliness_score.desc()).all()
    return regions

@router.get("/region/{region_id}", response_model=Dict[str, Any])
def get_region_score_detail(region_id: str, db: Session = Depends(get_db)):
    region = db.query(AdministrativeRegion).filter(AdministrativeRegion.id == region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Administrative region not found")

    result = ScoringService.calculate_region_score(db, region_id)
    child_regions = db.query(AdministrativeRegion).filter(AdministrativeRegion.parent_id == region_id).all()
    
    result["child_regions"] = [
        {
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "region_type": c.region_type,
            "score": c.cleanliness_score
        }
        for c in child_regions
    ]
    return result

@router.get("/leaderboard", response_model=List[LeaderboardItem])
def get_cleanliness_leaderboard(db: Session = Depends(get_db)):
    regions = db.query(AdministrativeRegion).order_by(AdministrativeRegion.cleanliness_score.desc()).all()
    items = []
    for rank, r in enumerate(regions, start=1):
        cleanups_count = db.query(Cleanup).join(Report).filter(
            Report.administrative_region_id == r.id,
            Cleanup.status == "VERIFIED"
        ).count()

        if r.cleanliness_score >= 85:
            label = "Excellent (Eco Benchmark)"
        elif r.cleanliness_score >= 70:
            label = "Good (Active Monitoring)"
        elif r.cleanliness_score >= 50:
            label = "Moderate (Needs Action)"
        else:
            label = "Critical (Priority Hotspot)"

        items.append(LeaderboardItem(
            rank=rank,
            region_id=r.id,
            region_name=r.name,
            region_type=r.region_type,
            score=r.cleanliness_score,
            cleanups_count=cleanups_count,
            status_label=label
        ))
    return items

@router.post("/recalculate")
def recalculate_all_scores(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ScoringService.recompute_all_scores(db)
    return {"status": "success", "message": "All hierarchical regional cleanliness scores recomputed successfully."}


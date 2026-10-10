from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserStatsOut
from app.security import get_current_user
from app.services.rewards_service import RewardsService

router = APIRouter(prefix="/points", tags=["Gamification & Rewards"])

@router.get("/me", response_model=UserStatsOut)
def get_my_points(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    stats = RewardsService.get_user_stats(db, current_user.id)
    return stats

@router.get("/leaderboard")
def get_citizens_leaderboard(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role == "CITIZEN").order_by(User.cached_points.desc()).limit(10).all()
    return [
        {
            "rank": idx + 1,
            "user_id": u.id,
            "full_name": u.full_name,
            "points": u.cached_points,
            "badge": "Eco Champion" if u.cached_points >= 250 else ("Ground Cleaner" if u.cached_points >= 100 else "Eco Scout")
        }
        for idx, u in enumerate(users)
    ]


from app.services.rewards_service import RewardsService
from app.models import User

def test_rewards_idempotency(db_session):
    user = db_session.query(User).filter(User.email == "citizen_test@test.org").first()
    initial_points = user.cached_points

    # 1. First award
    res1 = RewardsService.award_points(
        db=db_session,
        user_id=user.id,
        points_delta=25,
        reason="Report Verified",
        reference_type="REPORT_VERIFIED",
        reference_id="rep-uuid-001"
    )
    assert res1["awarded"] is True
    assert res1["duplicate_prevented"] is False
    assert user.cached_points == initial_points + 25

    # 2. Duplicate award attempt (same event & user)
    res2 = RewardsService.award_points(
        db=db_session,
        user_id=user.id,
        points_delta=25,
        reason="Report Verified",
        reference_type="REPORT_VERIFIED",
        reference_id="rep-uuid-001"
    )
    assert res2["awarded"] is False
    assert res2["duplicate_prevented"] is True
    assert user.cached_points == initial_points + 25  # Unchanged!

    # 3. Different report event awards normally
    res3 = RewardsService.award_points(
        db=db_session,
        user_id=user.id,
        points_delta=100,
        reason="Cleanup Verified",
        reference_type="CLEANUP_VERIFIED",
        reference_id="cleanup-uuid-002"
    )
    assert res3["awarded"] is True
    assert user.cached_points == initial_points + 25 + 100


from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CleanupBid, Report, User
from app.schemas import CleanupBidCreate, CleanupBidOut, CleanupFundingSummary
from app.security import get_current_user
from app.services.audit_service import AuditService


router = APIRouter(prefix="/reports", tags=["Cleanup Funding"])

FUNDABLE_REPORT_STATUSES = {
    "REPORTED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "CLEANING_IN_PROGRESS", "REOPENED"
}


def _to_paise(amount: Decimal) -> int:
    return int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _serialize_bid(bid: CleanupBid) -> CleanupBidOut:
    return CleanupBidOut(
        id=bid.id,
        report_id=bid.report_id,
        bidder_id=bid.bidder_id,
        bidder_name=bid.bidder.full_name if bid.bidder else "Unknown",
        amount=Decimal(bid.amount_paise) / Decimal(100),
        currency=bid.currency,
        message=bid.message,
        contact_email=bid.contact_email,
        contact_phone=bid.contact_phone,
        status=bid.status,
        created_at=bid.created_at,
    )


@router.post("/{report_id}/bids", response_model=CleanupBidOut)
def place_cleanup_bid(
    report_id: str,
    bid_in: CleanupBidCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a funding pledge. This endpoint does not charge or escrow money."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.is_duplicate or report.status not in FUNDABLE_REPORT_STATUSES:
        raise HTTPException(status_code=409, detail="This report is no longer accepting cleanup bids")

    amount_paise = _to_paise(bid_in.amount)
    if amount_paise <= 0:
        raise HTTPException(status_code=422, detail="Bid amount must be at least INR 0.01")

    bid = CleanupBid(
        report_id=report.id,
        bidder_id=current_user.id,
        amount_paise=amount_paise,
        currency="INR",
        message=bid_in.message,
        contact_email=str(bid_in.contact_email or current_user.email).lower(),
        contact_phone=bid_in.contact_phone,
        status="ACTIVE",
    )
    db.add(bid)
    db.commit()
    db.refresh(bid)

    AuditService.log(
        db,
        action="CLEANUP_BID_PLACED",
        entity_name="CleanupBid",
        entity_id=bid.id,
        actor_id=current_user.id,
        payload={"report_id": report.id, "amount_paise": amount_paise, "currency": "INR"},
    )
    return _serialize_bid(bid)


@router.get("/{report_id}/bids", response_model=CleanupFundingSummary)
def get_cleanup_bids(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Show the pledged total and bidder contact details to signed-in users."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    bids = db.query(CleanupBid).filter(
        CleanupBid.report_id == report.id,
        CleanupBid.status == "ACTIVE",
    ).order_by(CleanupBid.created_at.asc()).all()
    total_paise = sum(b.amount_paise for b in bids)
    return CleanupFundingSummary(
        report_id=report.id,
        total_amount=Decimal(total_paise) / Decimal(100),
        currency="INR",
        bid_count=len(bids),
        bids=[_serialize_bid(b) for b in bids],
    )

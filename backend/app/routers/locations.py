from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdministrativeRegion, Municipality, User
from app.schemas import LocationResolutionOut, LocationResolveRequest, MunicipalityOut
from app.security import get_current_user
from app.services.location_service import LocationLookupError, reverse_geocode_india


router = APIRouter(prefix="/locations", tags=["Locations"])


def _matching_municipality(db: Session, locality: str, latitude: float, longitude: float) -> Municipality | None:
    candidates = db.query(Municipality).all()
    normalized = locality.casefold()
    matching = [
        municipality
        for municipality in candidates
        if normalized == municipality.name.casefold()
        or normalized in municipality.name.casefold()
        or municipality.name.casefold() in normalized
    ]
    if not matching:
        return None
    return min(
        matching,
        key=lambda municipality: (
            (municipality.administrative_region.center_lat - latitude) ** 2
            + (municipality.administrative_region.center_lng - longitude) ** 2
        ),
    )


@router.post("/resolve", response_model=LocationResolutionOut)
async def resolve_device_location(
    location: LocationResolveRequest,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resolve one user-triggered device coordinate and cache its Indian local body."""
    try:
        resolved = await reverse_geocode_india(location.latitude, location.longitude)
    except LocationLookupError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    municipality = _matching_municipality(db, resolved.locality, location.latitude, location.longitude)
    if not municipality:
        region_code = f"OSM-IN-{resolved.source_key}"
        region = db.query(AdministrativeRegion).filter(AdministrativeRegion.code == region_code).first()
        if not region:
            region = AdministrativeRegion(
                code=region_code,
                name=resolved.locality,
                region_type="MUNICIPAL_AREA",
                center_lat=location.latitude,
                center_lng=location.longitude,
                population=0,
                area_sq_km=0.0,
            )
            db.add(region)
            db.flush()
        municipality = Municipality(
            name=resolved.locality,
            official_email="",
            administrative_region_id=region.id,
            verification_status="DISCOVERED",
        )
        db.add(municipality)
    else:
        region = municipality.administrative_region

    db.commit()
    db.refresh(region)
    db.refresh(municipality)

    return LocationResolutionOut(
        latitude=location.latitude,
        longitude=location.longitude,
        accuracy=location.accuracy,
        address=resolved.address,
        locality=resolved.locality,
        district=resolved.district,
        state=resolved.state,
        postcode=resolved.postcode,
        country_code=resolved.country_code,
        administrative_region_id=region.id,
        municipality=MunicipalityOut.model_validate(municipality),
        source=resolved.source,
        attribution=resolved.attribution,
    )

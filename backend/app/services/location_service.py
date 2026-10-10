import hashlib
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx

from app.config import settings


class LocationLookupError(Exception):
    pass


@dataclass(frozen=True)
class ResolvedLocation:
    address: str
    locality: str
    district: Optional[str]
    state: Optional[str]
    postcode: Optional[str]
    country_code: str
    source_key: str
    source: str = "OpenStreetMap Nominatim"
    attribution: str = "© OpenStreetMap contributors, ODbL 1.0"


_cache: Dict[str, tuple[float, ResolvedLocation]] = {}


def _cache_key(latitude: float, longitude: float) -> str:
    return f"{latitude:.5f},{longitude:.5f}"


def _first(address: Dict[str, Any], *keys: str) -> Optional[str]:
    for key in keys:
        value = address.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


async def reverse_geocode_india(latitude: float, longitude: float) -> ResolvedLocation:
    key = _cache_key(latitude, longitude)
    cached = _cache.get(key)
    if cached and time.monotonic() - cached[0] < settings.GEOCODING_CACHE_SECONDS:
        return cached[1]

    try:
        async with httpx.AsyncClient(
            base_url=settings.NOMINATIM_BASE_URL,
            headers={
                "User-Agent": settings.GEOCODING_USER_AGENT,
                "Accept-Language": "en",
            },
            timeout=10.0,
        ) as client:
            response = await client.get(
                "/reverse",
                params={
                    "format": "jsonv2",
                    "lat": latitude,
                    "lon": longitude,
                    "addressdetails": 1,
                    "zoom": 18,
                    "layer": "address",
                },
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise LocationLookupError("The live location service is temporarily unavailable. Please try again.") from exc

    address = payload.get("address") if isinstance(payload, dict) else None
    if not isinstance(address, dict):
        raise LocationLookupError("No civic address was found for this device location.")

    country_code = str(address.get("country_code", "")).lower()
    if country_code != "in":
        raise LocationLookupError("EcoTrack municipal discovery currently supports locations within India.")

    locality = _first(address, "municipality", "city", "town", "village", "city_district", "county")
    if not locality:
        raise LocationLookupError("A responsible Indian local body could not be identified for this location.")

    district = _first(address, "state_district", "county", "district")
    state = _first(address, "state")
    display_name = str(payload.get("display_name", "")).strip()
    if not display_name:
        display_name = ", ".join(value for value in [locality, district, state, address.get("postcode"), "India"] if value)

    identity = "|".join(value or "" for value in [locality.lower(), (district or "").lower(), (state or "").lower()])
    source_key = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:20].upper()
    resolved = ResolvedLocation(
        address=display_name,
        locality=locality,
        district=district,
        state=state,
        postcode=_first(address, "postcode"),
        country_code=country_code,
        source_key=source_key,
    )

    if len(_cache) >= 1000:
        oldest_key = min(_cache, key=lambda item: _cache[item][0])
        _cache.pop(oldest_key, None)
    _cache[key] = (time.monotonic(), resolved)
    return resolved

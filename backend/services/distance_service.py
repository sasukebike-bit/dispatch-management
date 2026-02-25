import math
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """直線距離をHaversine公式で計算（km）"""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def geocode_address(address: str) -> tuple[float, float] | None:
    """住所をジオコーディングして(lat, lng)を返す。APIキーがなければNone"""
    if not GOOGLE_MAPS_API_KEY:
        return None
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params={"address": address, "key": GOOGLE_MAPS_API_KEY})
        data = resp.json()
        if data.get("status") == "OK":
            loc = data["results"][0]["geometry"]["location"]
            return loc["lat"], loc["lng"]
    return None


def calculate_distance_km(
    lat1: float | None, lng1: float | None,
    lat2: float | None, lng2: float | None
) -> float:
    """2点間の距離を返す。座標がなければ0"""
    if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
        return 0.0
    return haversine_km(lat1, lng1, lat2, lng2)

from __future__ import annotations
from pydantic import BaseModel
from typing import Optional
from datetime import date


# --- Driver ---

class DriverCreate(BaseModel):
    name: str

class DriverResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# --- Order ---

class OrderCreate(BaseModel):
    delivery_date: date
    recipient_name: Optional[str] = None
    address: str
    time_start: str   # "HH:MM"
    time_end: str     # "HH:MM"
    notes: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class OrderResponse(BaseModel):
    id: int
    delivery_date: date
    recipient_name: Optional[str]
    address: str
    time_start: str
    time_end: str
    notes: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Dispatch ---

class AssignmentItem(BaseModel):
    order_id: int
    driver_id: int

class ManualAssignRequest(BaseModel):
    assignments: list[AssignmentItem]

class DispatchResultItem(BaseModel):
    driver_id: int
    driver_name: str
    orders: list[OrderResponse]
    total_jobs: int
    total_distance_km: float

class DispatchResult(BaseModel):
    date: date
    assignments: list[DispatchResultItem]
    unassigned_orders: list[OrderResponse]

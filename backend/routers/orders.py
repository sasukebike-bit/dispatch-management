from __future__ import annotations
import csv
import io
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Order, Assignment
from schemas import OrderCreate, OrderResponse
from services.distance_service import geocode_address

router = APIRouter(prefix="/orders", tags=["orders"])


def to_response(order: Order) -> OrderResponse:
    driver_id = None
    driver_name = None
    if order.assignment:
        driver_id = order.assignment.driver_id
        driver_name = order.assignment.driver.name if order.assignment.driver else None
    return OrderResponse(
        id=order.id,
        delivery_date=order.delivery_date,
        address=order.address,
        time_start=order.time_start,
        time_end=order.time_end,
        notes=order.notes,
        lat=order.lat,
        lng=order.lng,
        driver_id=driver_id,
        driver_name=driver_name,
    )


@router.get("/", response_model=list[OrderResponse])
def list_orders(delivery_date: date = Query(...), db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.delivery_date == delivery_date).all()
    return [to_response(o) for o in orders]


@router.post("/", response_model=OrderResponse, status_code=201)
async def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    lat, lng = body.lat, body.lng
    # 座標がなければジオコーディングを試みる
    if lat is None or lng is None:
        result = await geocode_address(body.address)
        if result:
            lat, lng = result

    order = Order(
        delivery_date=body.delivery_date,
        address=body.address,
        time_start=body.time_start,
        time_end=body.time_end,
        notes=body.notes,
        lat=lat,
        lng=lng,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return to_response(order)


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(order_id: int, body: OrderCreate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    lat, lng = body.lat, body.lng
    if lat is None or lng is None:
        result = await geocode_address(body.address)
        if result:
            lat, lng = result

    order.delivery_date = body.delivery_date
    order.address = body.address
    order.time_start = body.time_start
    order.time_end = body.time_end
    order.notes = body.notes
    order.lat = lat
    order.lng = lng
    db.commit()
    db.refresh(order)
    return to_response(order)


@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()


@router.post("/import-csv", response_model=list[OrderResponse], status_code=201)
async def import_csv(delivery_date: date = Query(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    CSVフォーマット（ヘッダー行あり）:
    address,time_start,time_end,notes
    """
    content = await file.read()
    decoded = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))
    created = []
    for row in reader:
        lat, lng = None, None
        result = await geocode_address(row["address"])
        if result:
            lat, lng = result
        order = Order(
            delivery_date=delivery_date,
            address=row["address"],
            time_start=row["time_start"].strip(),
            time_end=row["time_end"].strip(),
            notes=row.get("notes", ""),
            lat=lat,
            lng=lng,
        )
        db.add(order)
        db.flush()
        created.append(order)
    db.commit()
    return [to_response(o) for o in created]

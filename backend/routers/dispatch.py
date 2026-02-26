from __future__ import annotations
from datetime import date
from fastapi import APIRouter, Depends, Query, Response, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Order, Driver, Assignment
from schemas import DispatchResult, DispatchResultItem, OrderResponse, ManualAssignRequest
from services.dispatch_engine import run_dispatch, total_distance
from services.pdf_service import generate_dispatch_pdf

router = APIRouter(prefix="/dispatch", tags=["dispatch"])


def order_to_response(order: Order, driver_id: int = None, driver_name: str = None) -> OrderResponse:
    return OrderResponse(
        id=order.id,
        delivery_date=order.delivery_date,
        recipient_name=order.recipient_name,
        address=order.address,
        time_start=order.time_start,
        time_end=order.time_end,
        notes=order.notes,
        lat=order.lat,
        lng=order.lng,
        driver_id=driver_id,
        driver_name=driver_name,
    )


@router.post("/run", response_model=DispatchResult)
def run_auto_dispatch(delivery_date: date = Query(...), db: Session = Depends(get_db)):
    """自動配車を実行し、結果をDBに保存して返す"""
    try:
        orders = db.query(Order).filter(Order.delivery_date == delivery_date).all()
        drivers = db.query(Driver).all()

        # 既存の割り当てをリセット
        db.query(Assignment).filter(Assignment.delivery_date == delivery_date).delete()
        db.commit()

        result = run_dispatch(orders, drivers)

        # 結果をDBに保存
        for driver_id, assigned_orders in result["assigned"].items():
            for order in assigned_orders:
                assignment = Assignment(
                    order_id=order.id,
                    driver_id=driver_id,
                    delivery_date=delivery_date,
                )
                db.add(assignment)
        db.commit()

        # レスポンス組み立て
        driver_map = {d.id: d for d in drivers}
        assignment_items = []
        for driver_id, assigned_orders in result["assigned"].items():
            driver = driver_map[driver_id]
            sorted_orders = sorted(assigned_orders, key=lambda o: o.time_start)
            assignment_items.append(DispatchResultItem(
                driver_id=driver_id,
                driver_name=driver.name,
                orders=[order_to_response(o, driver_id, driver.name) for o in sorted_orders],
                total_jobs=len(assigned_orders),
                total_distance_km=round(total_distance(sorted_orders), 2),
            ))

        return DispatchResult(
            date=delivery_date,
            assignments=assignment_items,
            unassigned_orders=[order_to_response(o) for o in result["unassigned"]],
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/result", response_model=DispatchResult)
def get_dispatch_result(delivery_date: date = Query(...), db: Session = Depends(get_db)):
    """指定日の配車結果を取得"""
    drivers = db.query(Driver).all()
    driver_map = {d.id: d for d in drivers}

    assignments = (
        db.query(Assignment)
        .filter(Assignment.delivery_date == delivery_date)
        .all()
    )
    assigned_order_ids = {a.order_id for a in assignments}

    grouped: dict[int, list[Order]] = {d.id: [] for d in drivers}
    for a in assignments:
        grouped[a.driver_id].append(a.order)

    all_orders = db.query(Order).filter(Order.delivery_date == delivery_date).all()
    unassigned = [o for o in all_orders if o.id not in assigned_order_ids]

    assignment_items = []
    for driver_id, assigned_orders in grouped.items():
        driver = driver_map[driver_id]
        sorted_orders = sorted(assigned_orders, key=lambda o: o.time_start)
        assignment_items.append(DispatchResultItem(
            driver_id=driver_id,
            driver_name=driver.name,
            orders=[order_to_response(o, driver_id, driver.name) for o in sorted_orders],
            total_jobs=len(assigned_orders),
            total_distance_km=round(total_distance(sorted_orders), 2),
        ))

    return DispatchResult(
        date=delivery_date,
        assignments=assignment_items,
        unassigned_orders=[order_to_response(o) for o in unassigned],
    )


@router.put("/manual", response_model=DispatchResult)
def manual_assign(
    delivery_date: date = Query(...),
    body: ManualAssignRequest = ...,
    db: Session = Depends(get_db),
):
    """手動で配車を上書きする"""
    db.query(Assignment).filter(Assignment.delivery_date == delivery_date).delete()
    db.commit()
    for item in body.assignments:
        assignment = Assignment(
            order_id=item.order_id,
            driver_id=item.driver_id,
            delivery_date=delivery_date,
        )
        db.add(assignment)
    db.commit()
    return get_dispatch_result(delivery_date=delivery_date, db=db)


@router.get("/pdf")
def download_pdf(delivery_date: date = Query(...), db: Session = Depends(get_db)):
    """配達指示書PDFをダウンロード"""
    result = get_dispatch_result(delivery_date=delivery_date, db=db)
    pdf_bytes = generate_dispatch_pdf(result)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=dispatch_{delivery_date}.pdf"},
    )

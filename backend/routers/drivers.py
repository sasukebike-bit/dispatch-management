from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from database import get_db
from models import Driver, Assignment
from schemas import DriverCreate, DriverResponse

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.get("/", response_model=list[DriverResponse])
def list_drivers(db: Session = Depends(get_db)):
    return db.query(Driver).all()


@router.post("/", response_model=DriverResponse, status_code=201)
def create_driver(body: DriverCreate, db: Session = Depends(get_db)):
    driver = Driver(name=body.name)
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


@router.delete("/{driver_id}", status_code=204)
def delete_driver(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    try:
        for assignment in driver.assignments:
            db.delete(assignment)
        db.flush()
        db.delete(driver)
        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

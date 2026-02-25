from sqlalchemy import Column, Integer, String, Time, Text, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from database import Base


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)

    assignments = relationship("Assignment", back_populates="driver")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    delivery_date = Column(Date, nullable=False)
    recipient_name = Column(String(200), nullable=True)
    address = Column(String(500), nullable=False)
    time_start = Column(String(5), nullable=False)   # "HH:MM"
    time_end = Column(String(5), nullable=False)     # "HH:MM"
    notes = Column(Text, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    assignment = relationship("Assignment", back_populates="order", uselist=False)


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    delivery_date = Column(Date, nullable=False)

    order = relationship("Order", back_populates="assignment")
    driver = relationship("Driver", back_populates="assignments")

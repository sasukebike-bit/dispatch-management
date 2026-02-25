from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import drivers, orders, dispatch

Base.metadata.create_all(bind=engine)

app = FastAPI(title="配車管理システム API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(drivers.router)
app.include_router(orders.router)
app.include_router(dispatch.router)


@app.get("/health")
def health():
    return {"status": "ok"}

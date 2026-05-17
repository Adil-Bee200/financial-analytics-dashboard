from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings
from app.core.database import check_db_connection, init_db
from app.core.logging_config import setup_logging

setup_logging()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


_cors_origins = settings.get_cors_origins()
_allow_credentials = "*" not in _cors_origins

app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "message": settings.api_title,
        "version": settings.api_version,
        "status": "running",
        "env": settings.app_env,
    }


@app.get("/health")
async def health_check():
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "up" if db_ok else "down",
    }

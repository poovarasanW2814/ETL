"""Top-level API router registration."""

from fastapi import APIRouter

from app.api.v1.endpoints.mcp_jobs import router as mcp_jobs_router
from app.api.v1.endpoints.transform_dates import router as transform_dates_router
from app.api.v1.endpoints.transform_status import router as transform_status_router
from app.core.constants import API_PREFIX, API_VERSION

api_router = APIRouter(prefix=f"{API_PREFIX}{API_VERSION}")
api_router.include_router(mcp_jobs_router)
api_router.include_router(transform_dates_router)
api_router.include_router(transform_status_router)

from fastapi import APIRouter

from app.api.routes.admin import router as admin_router
from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router

# This router is just an aggregator: it combines smaller feature routers into one API tree.
api_router = APIRouter()
# Health endpoints are exposed first so basic uptime checks stay easy to find.
api_router.include_router(health_router)
# Auth endpoints are included here so `/api/v1/auth/...` stays organized in one module.
api_router.include_router(auth_router)
# Admin endpoints are mounted separately so admin-only actions are easy to lock down.
api_router.include_router(admin_router)



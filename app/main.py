from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings

settings = get_settings()


app = FastAPI(title=settings.app_name, debug=settings.debug)
# Mount the versioned API router under `/api/v1`.
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/")
def root() -> dict[str, str]:
    # Small landing endpoint so you can quickly confirm the server is alive.
    return {
        "message": "Minecraft Server Website starter is running",
        "docs": "/docs",
        "health": "/api/v1/health",
    }



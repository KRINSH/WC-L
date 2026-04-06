from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings

settings = get_settings()
project_root = Path(__file__).resolve().parents[1]
frontend_dir = project_root / "frontend"
frontend_static_dir = frontend_dir / "static"
frontend_index_file = frontend_dir / "index.html"


app = FastAPI(title=settings.app_name, debug=settings.debug)
# Allow local frontend dev servers to call the API from another origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Mount the versioned API router under `/api/v1`.
app.include_router(api_router, prefix=settings.api_v1_prefix)

if frontend_static_dir.exists():
    # Serve frontend assets so opening `/` works without a separate static host.
    app.mount("/static", StaticFiles(directory=frontend_static_dir), name="static")


@app.get("/", response_model=None)
def root(request: Request) -> object:
    accepts_html = "text/html" in request.headers.get("accept", "")
    if frontend_index_file.exists() and accepts_html:
        return FileResponse(frontend_index_file)
    # Fallback response if the frontend folder is missing in a minimal backend-only setup.
    return {
        "message": "Minecraft Server Website starter is running",
        "docs": "/docs",
        "health": "/api/v1/health",
    }



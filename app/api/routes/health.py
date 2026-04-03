from fastapi import APIRouter

# Keep health checks in their own tiny router so monitoring can hit them directly.
router = APIRouter(prefix="", tags=["health"])


# Return a simple ok payload for load balancers and smoke tests.
@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


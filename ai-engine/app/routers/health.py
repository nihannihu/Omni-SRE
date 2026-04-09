"""
Health Router — GET /health + GET /health/sync endpoints.
"""

from fastapi import APIRouter
from app.config import get_settings
from app.services.memory import memory_service

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check for the AI engine and its dependencies."""
    settings = get_settings()

    hindsight_status = "reachable" if memory_service.is_available() else "unreachable"
    groq_status = "configured" if settings.GROQ_API_KEY else "not_configured"
    sync_status = memory_service.get_sync_status()

    return {
        "status": "healthy",
        "service": "omni-sre-ai-engine",
        "groq_api": groq_status,
        "groq_model": settings.GROQ_MODEL,
        "hindsight_server": hindsight_status,
        "hindsight_url": settings.HINDSIGHT_BASE_URL,
        "sync": sync_status,
    }


@router.get("/health/sync")
async def sync_status():
    """
    MongoDB ↔ Hindsight sync health.
    Returns pending retain failures that need reconciliation.
    """
    return memory_service.get_sync_status()

"""
Omni-SRE AI Engine — FastAPI Entrypoint.
Context-aware code review agent powered by Groq + Hindsight.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import review, ingest, health

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("omni-sre")

# ── App ──
app = FastAPI(
    title="Omni-SRE AI Engine",
    description="Context-aware code review agent with persistent memory via Vectorize Hindsight.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──
app.include_router(review.router, tags=["Review"])
app.include_router(ingest.router, tags=["Ingest"])
app.include_router(health.router, tags=["Health"])


@app.on_event("startup")
async def startup():
    settings = get_settings()
    logger.info("=" * 60)
    logger.info("  Omni-SRE AI Engine Starting")
    logger.info(f"  Groq Model:    {settings.GROQ_MODEL}")
    logger.info(f"  Fallback:      {settings.GROQ_FALLBACK_MODEL}")
    logger.info(f"  Hindsight:     {settings.HINDSIGHT_BASE_URL}")
    logger.info("=" * 60)


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.FASTAPI_PORT,
        reload=True,
        log_level=settings.LOG_LEVEL,
    )

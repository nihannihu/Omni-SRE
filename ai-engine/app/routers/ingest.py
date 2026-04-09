"""
Ingest Router — POST /ingest endpoint.
Manually ingest knowledge (incidents, conventions, etc.) into Hindsight.
"""

import uuid
import logging
from fastapi import APIRouter, HTTPException

from app.models.review import IngestRequest, IngestResponse
from app.services.memory import memory_service

logger = logging.getLogger("omni-sre.router.ingest")
router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest_knowledge(request: IngestRequest):
    """
    Ingest a piece of knowledge into Hindsight memory.
    Supports: incident, convention, pr_review, architecture_decision.
    """
    try:
        ingest_id = f"ing-{uuid.uuid4().hex[:12]}"
        bank_id = request.bank_id
        content = request.content
        content_type = request.content_type

        logger.info(f"[INGEST] {content_type} into bank {bank_id}: {content.title}")

        success = False
        doc_id = ""

        if content_type == "incident":
            incident_id = request.metadata.get("incident_id", f"INC-{uuid.uuid4().hex[:6]}")
            doc_id = f"incident-{incident_id}"

            full_content = f"""Security Incident {incident_id}:
Severity: {content.severity or 'unknown'}
Title: {content.title}
Root Cause: {content.body}
Affected files: {', '.join(content.affected_files)}
Lessons Learned: {content.lessons_learned}
"""
            success = await memory_service.retain_incident(
                bank_id=bank_id,
                content=full_content,
                incident_id=incident_id,
                severity=content.severity or "P3",
                timestamp=None,
            )

        elif content_type == "convention":
            doc_id = f"convention-{uuid.uuid4().hex[:8]}"
            full_content = f"""Team Convention: {content.title}
{content.body}
"""
            success = await memory_service.retain_convention(
                bank_id=bank_id,
                content=full_content,
                doc_id=doc_id,
            )

        elif content_type == "pr_review":
            doc_id = f"pr-manual-{uuid.uuid4().hex[:8]}"
            full_content = f"""Code Review: {content.title}
{content.body}
Affected files: {', '.join(content.affected_files)}
"""
            success = await memory_service.retain_review(
                bank_id=bank_id,
                review_summary=full_content,
                pr_number=0,
                repo_name=request.metadata.get("repo", "unknown"),
            )

        elif content_type == "architecture_decision":
            doc_id = f"adr-{uuid.uuid4().hex[:8]}"
            # Use convention retain for ADRs
            full_content = f"""Architecture Decision: {content.title}
{content.body}
"""
            success = await memory_service.retain_convention(
                bank_id=bank_id,
                content=full_content,
                doc_id=doc_id,
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown content_type: {content_type}")

        return IngestResponse(
            ingest_id=ingest_id,
            status="completed" if success else "failed",
            bank_id=bank_id,
            document_id=doc_id,
            message=f"{'Successfully ingested' if success else 'Failed to ingest'} {content_type}",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[INGEST] Failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

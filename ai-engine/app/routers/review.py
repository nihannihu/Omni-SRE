"""
Review Router — POST /review + GET /review/stream SSE endpoint.
"""

import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.review import ReviewRequest, ReviewResponse
from app.services.orchestrator import execute_review, stream_review_progress

logger = logging.getLogger("omni-sre.router.review")
router = APIRouter()


@router.post("/review", response_model=ReviewResponse)
async def trigger_review(request: ReviewRequest):
    """
    Trigger a context-aware code review (synchronous).
    Returns the full result when complete.
    """
    try:
        logger.info(f"[API] Review request received: {request.review_id}")
        result = await execute_review(request)
        return result
    except Exception as e:
        logger.error(f"[API] Review failed: {e}", exc_info=True)
        return ReviewResponse(
            review_id=request.review_id,
            status="failed",
            error={
                "code": "REVIEW_EXECUTION_ERROR",
                "message": str(e)[:500],
            },
        )


@router.post("/review/stream")
async def stream_review(request: ReviewRequest):
    """
    Trigger a context-aware code review with SSE streaming.

    The frontend receives real-time progress events instead of
    staring at a blank loading screen during the 6-hop chain:
    React → Node → Python → Groq → Hindsight → Python → Node → React

    Events:
    - review_started: Diff received, analysis beginning
    - diff_classified: Semantic patterns detected
    - recall_started: Querying Hindsight memory
    - recall_complete: Memories retrieved + maturity level
    - llm_started: Sending to Groq with token budget
    - finding_discovered: Individual finding (streamed as found)
    - retain_started: Saving review to memory
    - review_complete: Final result with all findings
    """

    async def event_generator():
        try:
            async for event in stream_review_progress(request):
                # SSE format: event: name\ndata: json\n\n
                event_name = event.get("event", "message")
                event_data = json.dumps(event.get("data", {}))
                yield f"event: {event_name}\ndata: {event_data}\n\n"
        except Exception as e:
            logger.error(f"[SSE] Stream error: {e}", exc_info=True)
            error_data = json.dumps({
                "code": "STREAM_ERROR",
                "message": str(e)[:500],
            })
            yield f"event: error\ndata: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )

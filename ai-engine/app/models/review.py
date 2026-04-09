"""
Pydantic models for request/response schemas across the AI engine.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Review Models ──

class RepositoryInfo(BaseModel):
    full_name: str
    provider: str = "github"
    language: str = "unknown"
    default_branch: str = "main"


class PullRequestInfo(BaseModel):
    number: int = 0
    title: str = ""
    author: str = ""
    base_branch: str = "main"
    head_branch: str = ""
    diff: str
    files_changed: list[str] = []


class ReviewConfig(BaseModel):
    llm_model: str = "qwen/qwen3-32b"
    severity_threshold: str = "medium"
    max_findings: int = 20
    include_suggestions: bool = True


class ReviewRequest(BaseModel):
    review_id: str
    workspace_id: str
    bank_id: str
    repository: RepositoryInfo
    pull_request: PullRequestInfo
    config: ReviewConfig = ReviewConfig()


class MemoryCitation(BaseModel):
    fact_id: str = ""
    text: str = ""
    type: str = ""  # world, experience, observation
    context: str = ""
    occurred_at: Optional[str] = None


class SuggestedFix(BaseModel):
    description: str = ""
    code: str = ""


class Finding(BaseModel):
    id: str
    severity: str  # critical, high, medium, low, info
    category: str  # security, convention, performance, bug, style
    file: str = ""
    line_start: int = 0
    line_end: int = 0
    title: str
    description: str
    suggested_fix: Optional[SuggestedFix] = None
    memory_citations: list[MemoryCitation] = []
    confidence: float = 0.5


class ReviewSummary(BaseModel):
    total_findings: int = 0
    by_severity: dict = {}
    memories_recalled: int = 0
    observations_used: int = 0
    review_duration_ms: int = 0


class LLMUsage(BaseModel):
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


class ReviewResponse(BaseModel):
    review_id: str
    status: str = "completed"  # completed, partial_failure, failed
    findings: list[Finding] = []
    summary: ReviewSummary = ReviewSummary()
    memory_retained: bool = False
    llm_usage: LLMUsage = LLMUsage()
    maturity: Optional[dict] = None  # Memory maturity signal: COLD→WARMING→CONTEXTUAL→EXPERT
    error: Optional[dict] = None


# ── Ingest Models ──

class IngestContent(BaseModel):
    title: str
    body: str
    severity: Optional[str] = None
    affected_files: list[str] = []
    lessons_learned: str = ""


class IngestRequest(BaseModel):
    workspace_id: str
    bank_id: str
    content_type: str  # incident, convention, pr_review, architecture_decision
    content: IngestContent
    metadata: dict = {}


class IngestResponse(BaseModel):
    ingest_id: str
    status: str = "processing"
    bank_id: str
    document_id: str
    message: str = ""

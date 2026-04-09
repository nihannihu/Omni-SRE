"""
Hindsight Memory Service — Hardened.

Key improvements:
1. Dynamic recall budget based on diff classification
2. Enriched retain with severity tags, pattern tags, and file entities
3. Sync tracking — logs retain failures for reconciliation
4. Observation scope configuration for better consolidation
"""

import logging
import time
from typing import Optional
from app.config import get_settings

logger = logging.getLogger("omni-sre.memory")

# Track retain failures for sync reconciliation
_retain_failures: list[dict] = []


class MemoryService:
    """Wrapper around the Hindsight Python SDK."""

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    @property
    def client(self):
        if self._client is None:
            try:
                from hindsight_client import Hindsight
                self._client = Hindsight(base_url=self.settings.HINDSIGHT_BASE_URL)
                logger.info(f"[MEMORY] Connected to Hindsight at {self.settings.HINDSIGHT_BASE_URL}")
            except Exception as e:
                logger.error(f"[MEMORY] Failed to connect to Hindsight: {e}")
                self._client = None
        return self._client

    def _parse_results(self, response) -> list[dict]:
        """Normalize Hindsight response into list of dicts."""
        results = []
        for r in (response.results if hasattr(response, 'results') else []):
            results.append({
                "fact_id": getattr(r, 'id', ''),
                "text": getattr(r, 'text', ''),
                "type": getattr(r, 'type', ''),
                "context": getattr(r, 'context', ''),
                "occurred_at": getattr(r, 'occurred_start', None),
                "tags": getattr(r, 'tags', []),
            })
        return results

    async def recall_security_context(
        self, bank_id: str, diff_summary: str, budget: str = "high"
    ) -> list[dict]:
        """
        Recall security-related memories relevant to this diff.
        Budget is dynamically set by diff classification — not hardcoded.
        """
        if not self.client:
            logger.warning("[MEMORY] Hindsight unavailable — skipping security recall")
            return []

        try:
            response = self.client.recall(
                bank_id=bank_id,
                query=f"Security vulnerabilities, incidents, or dangerous patterns related to: {diff_summary[:500]}",
                types=["experience", "observation"],
                budget=budget,  # Dynamic, not always "high"
                max_tokens=4096 if budget == "high" else 2048,
            )
            results = self._parse_results(response)
            logger.info(f"[MEMORY] Security recall ({budget}): {len(results)} facts")
            return results
        except Exception as e:
            logger.error(f"[MEMORY] Security recall failed: {e}")
            return []

    async def recall_file_history(self, bank_id: str, files: list[str]) -> list[dict]:
        """Recall memories about specific files."""
        if not self.client or not files:
            return []

        try:
            file_query = ", ".join(files[:10])
            response = self.client.recall(
                bank_id=bank_id,
                query=f"Code review history, conventions, and issues for files: {file_query}",
                types=["world", "observation"],
                budget="mid",
                max_tokens=2048,
            )
            results = self._parse_results(response)
            logger.info(f"[MEMORY] File history recall: {len(results)} facts for {len(files)} files")
            return results
        except Exception as e:
            logger.error(f"[MEMORY] File history recall failed: {e}")
            return []

    async def recall_conventions(self, bank_id: str) -> list[dict]:
        """Recall team coding conventions and rules."""
        if not self.client:
            return []

        try:
            response = self.client.recall(
                bank_id=bank_id,
                query="Team coding conventions, required patterns, mandatory rules, and forbidden practices",
                types=["observation", "world"],
                budget="mid",
                max_tokens=2048,
            )
            results = self._parse_results(response)
            logger.info(f"[MEMORY] Convention recall: {len(results)} facts")
            return results
        except Exception as e:
            logger.error(f"[MEMORY] Convention recall failed: {e}")
            return []

    async def retain_review(
        self,
        bank_id: str,
        review_summary: str,
        pr_number: int,
        repo_name: str,
        timestamp: Optional[str] = None,
        severity_tags: Optional[list[str]] = None,
        pattern_tags: Optional[list[str]] = None,
    ) -> bool:
        """
        Retain a completed review into Hindsight memory.
        Enhanced with severity and pattern tags for semantic retrieval.
        """
        if not self.client:
            self._track_failure("retain_review", bank_id, f"pr-{repo_name}-{pr_number}")
            return False

        try:
            tags = [f"repo:{repo_name}", f"pr:{pr_number}"]

            # Add severity tags so future recalls can filter by incident severity
            if severity_tags:
                unique_sevs = list(set(severity_tags))
                tags.extend([f"severity:{s}" for s in unique_sevs])

            # Add pattern tags so future recalls match semantic patterns
            if pattern_tags:
                tags.extend([f"pattern:{p}" for p in pattern_tags[:5]])

            # Extract file entities for Hindsight's graph-based recall
            entities = [{"text": repo_name, "type": "REPOSITORY"}]

            self.client.retain(
                bank_id=bank_id,
                content=review_summary,
                context="pr-review",
                timestamp=timestamp,
                document_id=f"pr-{repo_name}-{pr_number}",
                tags=tags,
                entities=entities,
                observation_scopes="per_tag",  # Generate observations per pattern tag
            )
            logger.info(f"[MEMORY] Retained review PR #{pr_number} with tags: {tags}")
            return True
        except Exception as e:
            self._track_failure("retain_review", bank_id, f"pr-{repo_name}-{pr_number}", str(e))
            return False

    async def retain_incident(
        self,
        bank_id: str,
        content: str,
        incident_id: str,
        severity: str,
        repo_name: str = "",
        affected_files: Optional[list[str]] = None,
        timestamp: Optional[str] = None,
    ) -> bool:
        """
        Retain a security incident with rich entity and tag metadata.
        This is the HIGHEST VALUE retain — drives the entire learning curve.
        """
        if not self.client:
            self._track_failure("retain_incident", bank_id, f"incident-{incident_id}")
            return False

        try:
            # Rich entity extraction for graph-based recall
            entities = [{"text": incident_id, "type": "INCIDENT"}]
            if affected_files:
                entities.extend([{"text": f, "type": "FILE"} for f in affected_files[:10]])
            if repo_name:
                entities.append({"text": repo_name, "type": "REPOSITORY"})

            tags = [f"severity:{severity}", f"type:incident"]
            if repo_name:
                tags.append(f"repo:{repo_name}")

            self.client.retain(
                bank_id=bank_id,
                content=content,
                context="security-incident",
                timestamp=timestamp,
                document_id=f"incident-{incident_id}",
                tags=tags,
                entities=entities,
                observation_scopes="per_tag",  # Consolidate per severity, per repo
            )
            logger.info(f"[MEMORY] Retained incident {incident_id} ({severity}) with {len(entities)} entities")
            return True
        except Exception as e:
            self._track_failure("retain_incident", bank_id, f"incident-{incident_id}", str(e))
            return False

    async def retain_convention(
        self,
        bank_id: str,
        content: str,
        doc_id: str = "team-conventions",
    ) -> bool:
        """Retain team conventions into Hindsight memory."""
        if not self.client:
            self._track_failure("retain_convention", bank_id, doc_id)
            return False

        try:
            self.client.retain(
                bank_id=bank_id,
                content=content,
                context="team-convention",
                document_id=doc_id,
                tags=["category:convention"],
                observation_scopes="combined",  # Merge all conventions into unified observations
            )
            logger.info(f"[MEMORY] Retained conventions (doc: {doc_id})")
            return True
        except Exception as e:
            self._track_failure("retain_convention", bank_id, doc_id, str(e))
            return False

    def is_available(self) -> bool:
        """Check if Hindsight server is reachable."""
        try:
            return self.client is not None
        except Exception:
            return False

    # ── Sync Reconciliation ──

    def _track_failure(self, operation: str, bank_id: str, doc_id: str, error: str = "unavailable"):
        """Track retain failures for later reconciliation."""
        failure = {
            "operation": operation,
            "bank_id": bank_id,
            "document_id": doc_id,
            "error": error,
            "timestamp": time.time(),
            "retried": False,
        }
        _retain_failures.append(failure)
        logger.warning(f"[SYNC] Retain failure tracked: {operation} / {doc_id} — {error}")

    @staticmethod
    def get_pending_syncs() -> list[dict]:
        """Get all unretried sync failures."""
        return [f for f in _retain_failures if not f["retried"]]

    @staticmethod
    def get_sync_status() -> dict:
        """Get sync health between MongoDB and Hindsight."""
        total = len(_retain_failures)
        pending = len([f for f in _retain_failures if not f["retried"]])
        return {
            "total_failures": total,
            "pending_retries": pending,
            "healthy": pending == 0,
            "failures": _retain_failures[-10:],  # Last 10
        }


# Singleton
memory_service = MemoryService()

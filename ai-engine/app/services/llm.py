"""
Groq LLM Service — Handles chat completions with tool use,
three-tier error handling, and model fallback.
"""

import json
import logging
from typing import Optional
from groq import Groq, APIError, RateLimitError
from app.config import get_settings

logger = logging.getLogger("omni-sre.llm")

# ── Tool Definitions for Code Review ──

REVIEW_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "report_finding",
            "description": "Report a code review finding with severity, category, file location, and optional memory citations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "severity": {
                        "type": "string",
                        "enum": ["critical", "high", "medium", "low", "info"],
                        "description": "Severity of the finding",
                    },
                    "category": {
                        "type": "string",
                        "enum": ["security", "convention", "performance", "bug", "style"],
                        "description": "Category of the finding",
                    },
                    "file": {
                        "type": "string",
                        "description": "File path where the issue was found",
                    },
                    "line_start": {
                        "type": "integer",
                        "description": "Starting line number",
                    },
                    "line_end": {
                        "type": "integer",
                        "description": "Ending line number",
                    },
                    "title": {
                        "type": "string",
                        "description": "Short title of the finding",
                    },
                    "description": {
                        "type": "string",
                        "description": "Detailed explanation of the issue and why it matters",
                    },
                    "suggested_fix": {
                        "type": "string",
                        "description": "Suggested code or approach to fix the issue",
                    },
                    "cited_memory_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "IDs of historical memories (incidents, reviews) that support this finding",
                    },
                    "confidence": {
                        "type": "number",
                        "description": "Confidence score 0.0-1.0",
                    },
                },
                "required": ["severity", "category", "title", "description"],
            },
        },
    },
]


class LLMService:
    """Groq LLM client with three-tier error resilience."""

    def __init__(self):
        self.settings = get_settings()
        self.client = Groq(api_key=self.settings.GROQ_API_KEY)
        self.current_model = self.settings.GROQ_MODEL
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def _build_system_prompt(self, memories: dict, repo_info: dict) -> str:
        """Build the system prompt with injected memory context."""
        memory_section = ""

        if memories.get("security"):
            memory_section += "\n## SECURITY HISTORY (from team memory)\n"
            for m in memories["security"]:
                memory_section += f"- [{m.get('type', 'unknown')}] (ID: {m.get('fact_id', 'N/A')}) {m.get('text', '')}\n"

        if memories.get("conventions"):
            memory_section += "\n## TEAM CONVENTIONS (from team memory)\n"
            for m in memories["conventions"]:
                memory_section += f"- [{m.get('type', 'unknown')}] {m.get('text', '')}\n"

        if memories.get("file_history"):
            memory_section += "\n## FILE HISTORY (from team memory)\n"
            for m in memories["file_history"]:
                memory_section += f"- [{m.get('type', 'unknown')}] {m.get('text', '')}\n"

        return f"""You are Omni-SRE, an elite context-aware code review agent. You don't just find generic issues — you understand this team's history, past incidents, and coding conventions.

## YOUR CAPABILITIES
1. You review code diffs for security vulnerabilities, bugs, performance issues, and convention violations.
2. You have access to this team's INSTITUTIONAL MEMORY — past security incidents, code review patterns, and coding conventions.
3. When you find an issue that relates to a past incident or convention, you MUST cite the specific memory by its ID using the cited_memory_ids field.
4. You escalate severity when historical context supports it (e.g., a pattern that caused a past production incident is CRITICAL, not just MEDIUM).

## REPOSITORY CONTEXT
- Repository: {repo_info.get('full_name', 'unknown')}
- Language: {repo_info.get('language', 'unknown')}
- Default branch: {repo_info.get('default_branch', 'main')}

{memory_section if memory_section else "## NO HISTORICAL CONTEXT AVAILABLE\\nThis is a first review — no team memory available yet. Provide standard analysis."}

## RULES
- Use the report_finding tool for EACH finding. Do not skip the tool.
- Be precise about file paths and line numbers.
- If you cite a memory, include the fact_id in cited_memory_ids.
- Only report findings at or above the configured severity threshold.
- Provide actionable suggested fixes, not vague advice.
- Confidence should be higher when supported by historical memory.
"""

    async def review_diff(
        self,
        diff: str,
        memories: dict,
        repo_info: dict,
        config: dict,
    ) -> tuple[list[dict], dict]:
        """
        Review a code diff using Groq with tool-use.
        Returns (findings, usage_stats).
        Implements three-tier error handling.
        """
        system_prompt = self._build_system_prompt(memories, repo_info)

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"Review the following code diff. Report all findings using the report_finding tool.\n\n```diff\n{diff[:30000]}\n```",
            },
        ]

        findings = []
        self.total_input_tokens = 0
        self.total_output_tokens = 0

        for attempt in range(self.settings.GROQ_MAX_RETRIES):
            try:
                response = self.client.chat.completions.create(
                    model=self.current_model,
                    messages=messages,
                    tools=REVIEW_TOOLS,
                    tool_choice="auto",
                    temperature=self.settings.GROQ_TEMPERATURE,
                    max_tokens=4096,
                )

                # Track usage
                if response.usage:
                    self.total_input_tokens += response.usage.prompt_tokens or 0
                    self.total_output_tokens += response.usage.completion_tokens or 0

                # Process tool calls
                choice = response.choices[0]

                if choice.message.tool_calls:
                    for tc in choice.message.tool_calls:
                        try:
                            args = json.loads(tc.function.arguments)
                            self._validate_finding(args)
                            findings.append(args)
                        except (json.JSONDecodeError, ValueError) as e:
                            logger.warning(f"[LLM] Malformed tool call (attempt {attempt+1}): {e}")
                            # Tier 1: Retry with corrective prompt
                            messages.append(choice.message.model_dump())
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tc.id,
                                "content": f"ERROR: Your tool call was malformed: {e}. Please retry with valid arguments.",
                            })
                            continue

                # If we got findings, we're done
                if findings:
                    break

                # If model returned text but no tool calls, try to parse
                if choice.message.content and not choice.message.tool_calls:
                    logger.warning("[LLM] Model returned text instead of tool calls. Attempting parse.")
                    parsed = self._parse_text_findings(choice.message.content)
                    if parsed:
                        findings = parsed
                        break

                    # Retry with explicit instruction
                    messages.append({
                        "role": "user",
                        "content": "You must use the report_finding tool for each finding. Do not respond with plain text.",
                    })

            except RateLimitError:
                logger.warning(f"[LLM] Rate limited (attempt {attempt+1}). Waiting...")
                import asyncio
                await asyncio.sleep(2 ** attempt)
                continue

            except APIError as e:
                logger.error(f"[LLM] API error (attempt {attempt+1}): {e}")
                # Tier 2: Model fallback
                if attempt == 1 and self.current_model != self.settings.GROQ_FALLBACK_MODEL:
                    logger.warning(f"[LLM] Switching to fallback model: {self.settings.GROQ_FALLBACK_MODEL}")
                    self.current_model = self.settings.GROQ_FALLBACK_MODEL
                continue

            except Exception as e:
                logger.error(f"[LLM] Unexpected error (attempt {attempt+1}): {e}")
                continue

        # Tier 3: If all tool-use attempts failed, try plain text fallback
        if not findings:
            logger.warning("[LLM] All tool-use attempts failed. Falling back to plain text review.")
            findings = await self._fallback_plain_review(diff, memories, repo_info)

        usage = {
            "model": self.current_model,
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "total_tokens": self.total_input_tokens + self.total_output_tokens,
        }

        return findings, usage

    def _validate_finding(self, args: dict):
        """Validate a finding from tool call arguments."""
        required = ["severity", "category", "title", "description"]
        for field in required:
            if field not in args:
                raise ValueError(f"Missing required field: {field}")

        if args["severity"] not in ["critical", "high", "medium", "low", "info"]:
            raise ValueError(f"Invalid severity: {args['severity']}")

        if args["category"] not in ["security", "convention", "performance", "bug", "style"]:
            raise ValueError(f"Invalid category: {args['category']}")

    async def _fallback_plain_review(
        self, diff: str, memories: dict, repo_info: dict
    ) -> list[dict]:
        """
        Tier 3 fallback: Strip tools, ask for JSON in plain text.
        Always returns something — never leaves user with zero results.
        """
        try:
            memory_text = ""
            for category, items in memories.items():
                if items:
                    memory_text += f"\n{category.upper()}:\n"
                    for m in items[:5]:
                        memory_text += f"- {m.get('text', '')}\n"

            response = self.client.chat.completions.create(
                model=self.current_model,
                messages=[
                    {
                        "role": "system",
                        "content": f"You are a code review agent. Respond ONLY with a JSON array of findings. Each finding must have: severity, category, file, title, description, suggested_fix. Historical context:\n{memory_text}",
                    },
                    {
                        "role": "user",
                        "content": f"Review this diff and return findings as a JSON array:\n```diff\n{diff[:20000]}\n```",
                    },
                ],
                temperature=0.2,
                max_tokens=4096,
            )

            if response.usage:
                self.total_input_tokens += response.usage.prompt_tokens or 0
                self.total_output_tokens += response.usage.completion_tokens or 0

            return self._parse_text_findings(response.choices[0].message.content or "")

        except Exception as e:
            logger.error(f"[LLM] Fallback plain review also failed: {e}")
            return [{
                "severity": "info",
                "category": "bug",
                "title": "Review could not be completed",
                "description": f"The AI engine encountered errors during review. Please try again or review manually. Error: {str(e)[:200]}",
                "confidence": 0.0,
            }]

    def _parse_text_findings(self, text: str) -> list[dict]:
        """Attempt to parse findings from plain text / JSON response."""
        try:
            # Try to extract JSON array from response
            import re
            json_match = re.search(r'\[[\s\S]*\]', text)
            if json_match:
                findings = json.loads(json_match.group())
                if isinstance(findings, list):
                    return [f for f in findings if isinstance(f, dict) and "title" in f]
        except (json.JSONDecodeError, Exception):
            pass
        return []


# Singleton
llm_service = LLMService()

"""
Token Budget Manager
Prevents context window overflow by intelligently allocating tokens
across system prompt, memories, and diff content.
"""

import logging

logger = logging.getLogger("omni-sre.token_budget")

# Approximate: 1 token ≈ 4 chars for English code
CHARS_PER_TOKEN = 4

# Model context limits (Groq)
MODEL_LIMITS = {
    "qwen/qwen3-32b": 32768,
    "openai/gpt-oss-120b": 131072,
}

# Reserved tokens
OUTPUT_RESERVE = 4096  # Always reserve for model output
SYSTEM_PROMPT_BASE = 800  # Base system prompt without memories


class TokenBudgetManager:
    """
    Allocates the context window across competing content:
    system_prompt + memories + diff + output_reserve = model_limit

    Priority:
    1. System prompt base (fixed ~800 tokens)
    2. Output reserve (fixed 4096 tokens)
    3. Security memories (highest value, up to 2048 tokens)
    4. Convention memories (up to 1024 tokens)
    5. File history memories (up to 1024 tokens)
    6. Diff content (fills remaining space)
    """

    def __init__(self, model: str = "qwen/qwen3-32b"):
        self.model_limit = MODEL_LIMITS.get(model, 32768)
        self.model = model

    def estimate_tokens(self, text: str) -> int:
        """Rough token estimate from character count."""
        return len(text) // CHARS_PER_TOKEN

    def allocate(
        self,
        system_prompt: str,
        memories: dict,
        diff: str,
    ) -> dict:
        """
        Allocate token budget and return truncated content.

        Returns {
            "system_prompt": str,      # unchanged
            "memories": dict,          # potentially truncated
            "diff": str,              # potentially truncated
            "token_breakdown": dict,   # for logging
            "truncated": bool,
        }
        """
        total_budget = self.model_limit - OUTPUT_RESERVE
        used = 0
        truncated = False

        # 1. System prompt (always full)
        prompt_tokens = self.estimate_tokens(system_prompt)
        used += prompt_tokens

        # 2. Allocate memory budgets
        memory_budget = min(total_budget - used - 2000, 6144)  # Cap at 6k, leave 2k for diff minimum
        memory_budget = max(memory_budget, 0)

        truncated_memories = {}
        memory_tokens = 0

        # Security memories get highest priority (60% of memory budget)
        security_budget_chars = int(memory_budget * 0.6 * CHARS_PER_TOKEN)
        truncated_memories["security"] = self._truncate_memories(
            memories.get("security", []), security_budget_chars
        )
        memory_tokens += self.estimate_tokens(
            " ".join(m.get("text", "") for m in truncated_memories["security"])
        )

        # Convention memories (25%)
        convention_budget_chars = int(memory_budget * 0.25 * CHARS_PER_TOKEN)
        truncated_memories["conventions"] = self._truncate_memories(
            memories.get("conventions", []), convention_budget_chars
        )
        memory_tokens += self.estimate_tokens(
            " ".join(m.get("text", "") for m in truncated_memories["conventions"])
        )

        # File history (15%)
        file_budget_chars = int(memory_budget * 0.15 * CHARS_PER_TOKEN)
        truncated_memories["file_history"] = self._truncate_memories(
            memories.get("file_history", []), file_budget_chars
        )
        memory_tokens += self.estimate_tokens(
            " ".join(m.get("text", "") for m in truncated_memories["file_history"])
        )

        used += memory_tokens

        # 3. Diff gets the remaining budget
        diff_budget_tokens = total_budget - used
        diff_budget_chars = diff_budget_tokens * CHARS_PER_TOKEN

        if len(diff) > diff_budget_chars:
            truncated = True
            logger.warning(
                f"[TOKEN] Diff truncated: {len(diff)} chars → {diff_budget_chars} chars "
                f"(model: {self.model}, limit: {self.model_limit} tokens)"
            )
            # Use smart truncation from diff_parser
            from app.services.diff_parser import smart_truncate_diff
            diff = smart_truncate_diff(diff, int(diff_budget_chars))

        diff_tokens = self.estimate_tokens(diff)
        used += diff_tokens

        breakdown = {
            "model_limit": self.model_limit,
            "output_reserve": OUTPUT_RESERVE,
            "system_prompt_tokens": prompt_tokens,
            "memory_tokens": memory_tokens,
            "diff_tokens": diff_tokens,
            "total_used": used,
            "remaining": total_budget - used,
            "utilization_pct": round(used / total_budget * 100, 1),
        }

        logger.info(
            f"[TOKEN] Budget: {breakdown['total_used']}/{total_budget} tokens used "
            f"({breakdown['utilization_pct']}%), memories={memory_tokens}, diff={diff_tokens}"
        )

        return {
            "system_prompt": system_prompt,
            "memories": truncated_memories,
            "diff": diff,
            "token_breakdown": breakdown,
            "truncated": truncated,
        }

    def _truncate_memories(self, memories: list[dict], max_chars: int) -> list[dict]:
        """Truncate memory list to fit within character budget."""
        if not memories:
            return []

        result = []
        chars_used = 0

        # Prioritize observations over raw experiences
        sorted_memories = sorted(
            memories,
            key=lambda m: (
                0 if m.get("type") == "observation" else 1,  # observations first
                0 if "incident" in m.get("context", "") else 1,  # incidents second
            )
        )

        for m in sorted_memories:
            text_len = len(m.get("text", ""))
            if chars_used + text_len > max_chars:
                # Try to fit a truncated version
                remaining = max_chars - chars_used
                if remaining > 100:  # Only include if meaningful
                    truncated = dict(m)
                    truncated["text"] = m.get("text", "")[:remaining] + "..."
                    result.append(truncated)
                break
            result.append(m)
            chars_used += text_len

        return result

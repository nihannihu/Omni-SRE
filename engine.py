"""
Omni-Review AI Core Engine (engine.py)

This is the production-grade FastAPI backend acting as the brain for the Omni-Review system.
Features:
1. Automated Vectorize Hindsight Cloud Seeding from seed_data.json
2. Multi-Pass Context-Aware Orchestration (Hindsight Cloud -> Groq LLM)
3. Token Budget Manager (prevents context window overflow)
4. Server-Sent Events (SSE) Streaming
5. Three-Tier Function Calling Error Resilience

Setup: Provide `HINDSIGHT_API_KEY` and `GROQ_API_KEY` in your environment.
"""

import os
import json
import time
import asyncio
import logging
from typing import AsyncGenerator
from dotenv import load_dotenv

# Load .env BEFORE any client initialization
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq, APIError, RateLimitError
from hindsight_client import Hindsight

# ── Configuration & Setup ──
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("omni-engine")

app = FastAPI(title="Omni-SRE Core Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Vectorize Hindsight Cloud Client (MANDATORY) ──
HINDSIGHT_CLOUD_URL = os.environ.get("HINDSIGHT_BASE_URL", "https://api.hindsight.vectorize.io")
HINDSIGHT_API_KEY = os.environ.get("HINDSIGHT_API_KEY")

if not HINDSIGHT_API_KEY:
    raise RuntimeError("FATAL: HINDSIGHT_API_KEY is not set. Cannot start without Hindsight Cloud credentials.")

hindsight = Hindsight(base_url=HINDSIGHT_CLOUD_URL, api_key=HINDSIGHT_API_KEY)
logger.info(f"Hindsight Cloud client initialized -> {HINDSIGHT_CLOUD_URL}")

# ── Groq Client (MANDATORY) ──
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("FATAL: GROQ_API_KEY is not set. Cannot start without Groq credentials.")

groq_client = Groq(api_key=GROQ_API_KEY)
MODEL_NAME = os.environ.get("GROQ_MODEL", "qwen/qwen3-32b")
FALLBACK_MODEL = os.environ.get("GROQ_FALLBACK_MODEL", "openai/gpt-oss-120b")
logger.info(f"Groq LLM initialized -> primary: {MODEL_NAME}, fallback: {FALLBACK_MODEL}")

# ── Hindsight Memory Ingestion (The Setup) ──

@app.post("/seed")
async def seed_memory(bank_id: str = "omni-review-bank"):
    """
    Reads seed_data.json and ingests it into Vectorize Hindsight Cloud.
    Ensures the "Learning Curve" is established with rich semantic tagging.
    """
    try:
        with open("seed_data.json", "r") as f:
            seed_data = json.load(f)
    except FileNotFoundError:
        return {"status": "error", "message": "seed_data.json not found."}

    logger.info(f"Seeding Hindsight memory bank '{bank_id}'...")

    # 1. Ingest Conventions
    for idx, rule in enumerate(seed_data.get("team_conventions", [])):
        await hindsight.aretain(
            bank_id=bank_id,
            content=f"{rule['rule_id']}: {rule['description']} (Regex Hint: {rule['enforcement_regex_hint']})",
            context="team-convention",
            document_id=f"convention-{rule['rule_id']}",
            tags=[f"severity:{rule['severity']}", "type:convention"]
        )
    
    # 2. Ingest Past Incidents
    for inc in seed_data.get("past_incidents", []):
        await hindsight.aretain(
            bank_id=bank_id,
            content=f"INCIDENT REPORT [{inc['date']}]: {inc['title']}. Cause: {inc['root_cause']}. Fix: {inc['resolution_code_snippet']}",
            context="security-incident",
            document_id=f"incident-{inc['incident_id']}",
            tags=inc['hindsight_tags'] + ["type:incident"]
        )

    # 3. Ingest Historical PRs
    for pr in seed_data.get("historical_prs", []):
        # We skip 'the_trap' PR as that is meant for the live evaluation request
        if pr["type"] == "the_trap":
            continue
            
        await hindsight.aretain(
            bank_id=bank_id,
            content=f"PR {pr['pr_id']} by {pr['author']}: {pr['title']}. Issue/Context: {pr['bug_explanation']}. Code Diff: {pr['diff']}",
            context="pr-review",
            document_id=f"pr-{pr['pr_id']}",
            tags=[f"author:{pr['author']}", f"pr_type:{pr['type']}", "type:pr_review"]
        )

    logger.info("Seeding complete.")
    return {"status": "success", "message": "Memory seeded successfully into Hindsight."}


# ── The God-Mode Features ──

class TokenBudgetManager:
    """Ensures context window does not overflow by capping memory and diff injections."""
    CHARS_PER_TOKEN = 4
    MAX_TOKENS = 32000
    RESERVED_OUTPUT = 4000

    @classmethod
    def truncate_content(cls, diff: str, memories: list, max_memory_ratio=0.5):
        """Balances the context window between the PR diff and Hindsight memories."""
        available_chars = (cls.MAX_TOKENS - cls.RESERVED_OUTPUT) * cls.CHARS_PER_TOKEN
        
        # Allocate bytes
        memory_budget = int(available_chars * max_memory_ratio)
        
        # Process memories
        formatted_memories = ""
        for mem in memories:
            text = getattr(mem, 'text', str(mem))
            if len(formatted_memories) + len(text) > memory_budget:
                formatted_memories += f"\n[...Truncated due to token limits]"
                break
            formatted_memories += f"\n- {text}"

        diff_budget = available_chars - len(formatted_memories)
        
        # Process diff
        truncated_diff = diff
        if len(diff) > diff_budget:
            logger.warning("Diff exceeds budget! Truncating...")
            truncated_diff = diff[:diff_budget] + "\n...[DIFF TRUNCATED]"

        return truncated_diff, formatted_memories


def safe_json_parse(completion_text: str):
    """Tier 3 Error Handling for LLM JSON Malformations."""
    import re
    try:
        return json.loads(completion_text)
    except json.JSONDecodeError:
        logger.warning("LLM generated malformed JSON. Using regex fallback extraction.")

        # Strip Qwen3 <think>...</think> reasoning blocks
        completion_text = re.sub(r'<think>[\s\S]*?</think>\s*', '', completion_text).strip()

        # Strip markdown code fences (```json ... ``` or ``` ... ```)
        stripped = re.sub(r'^```(?:json)?\s*\n?', '', completion_text.strip(), flags=re.MULTILINE)
        stripped = re.sub(r'\n?```\s*$', '', stripped.strip(), flags=re.MULTILINE)
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            pass

        # Attempt to extract a JSON array [...] or object {...}
        arr_match = re.search(r'\[[\s\S]*\]', completion_text)
        if arr_match:
            try:
                return json.loads(arr_match.group(0))
            except json.JSONDecodeError:
                pass

        obj_match = re.search(r'\{[\s\S]*\}', completion_text)
        if obj_match:
            try:
                result = json.loads(obj_match.group(0))
                return [result] if isinstance(result, dict) else result
            except json.JSONDecodeError:
                pass

        # Final fallback
        logger.error(f"All JSON parse attempts failed. Raw LLM output: {completion_text[:500]}")
        return [{"severity": "info", "title": "Parsing Error", "description": "LLM output could not be parsed."}]



# ── Groq & Hindsight Orchestration (The Brain) ──

async def execute_review_stream(pr_diff: str, bank_id: str) -> AsyncGenerator[str, None]:
    """
    Core orchestrator flow streaming Server-Sent Events (SSE).
    Strictly enforces Hindsight Cloud integration — NO mock fallbacks.
    """
    try:
        yield f"data: {json.dumps({'step': 1, 'message': 'Analyzing Diff Structure...'})}\n\n"
        await asyncio.sleep(0.3)

        # ── Step 2: Hindsight Cloud Memory Recall (MANDATORY) ──
        yield f"data: {json.dumps({'step': 2, 'message': 'Querying Vectorize Hindsight Cloud for historical patterns...'})}\n\n"

        try:
            recall_response = await hindsight.arecall(
                bank_id=bank_id,
                query=f"Security patterns, memory leaks, missing tokens, missing auth headers in: {pr_diff[:1000]}",
                types=["experience", "observation"],
                budget="high"
            )
            memories = recall_response.results if recall_response.results else []
        except Exception as e:
            logger.error(f"CRITICAL: Hindsight Cloud recall failed: {e}")
            yield f"data: {json.dumps({'status': 'error', 'message': f'CRITICAL: Vectorize Hindsight Cloud Connection Failed: {str(e)}. Verify API Key and Cloud Instance.'})}\n\n"
            return  # Abort the stream — do NOT fake it

        # ── Extract tags from RecallResults for LLM context injection ──
        memory_texts = []
        all_tags = set()
        for mem in memories:
            text = getattr(mem, 'text', str(mem))
            tags = getattr(mem, 'tags', []) or []
            doc_id = getattr(mem, 'document_id', None) or ''
            context = getattr(mem, 'context', None) or ''
            # Build a rich memory string with tags inline
            tag_str = ' '.join(f'[{t}]' for t in tags) if tags else ''
            memory_texts.append(f"{text} {tag_str} (doc:{doc_id}, ctx:{context})")
            all_tags.update(tags)

        tag_summary = ', '.join(sorted(all_tags)) if all_tags else 'none'
        yield f"data: {json.dumps({'step': 3, 'message': f'Memory Recalled: {len(memories)} contexts, tags: [{tag_summary}]'})}\n\n"

        # ── Step 3: Context Truncation & Budgeting ──
        safe_diff, safe_memories = TokenBudgetManager.truncate_content(pr_diff, memory_texts)

        yield f"data: {json.dumps({'step': 4, 'message': f'Generating Review via {MODEL_NAME}...'})}\n\n"

        # ── Step 4: LLM Prompt Construction with Tag Injection ──
        system_prompt = f"""
You are Omni-Review, an elite enterprise Code Review Agent with context-aware memory of this team's past incidents and conventions.
Review the pull request diff below.

TEAM HISTORY / HINDSIGHT MEMORY (retrieved from Vectorize Hindsight Cloud):
{safe_memories if safe_memories else "No relevant history found."}

DETECTED MEMORY TAGS: {tag_summary}

INSTRUCTIONS:
1. If the diff violates a specific team convention or replicates a past incident, you MUST flag it as CRITICAL and explicitly reference the incident/convention ID.
2. If the memory provides tags like [pattern:async-generator-leak] or [severity:critical], you MUST explicitly include them verbatim in your finding descriptions.
3. Output your response ONLY as a JSON array of finding objects, each with fields: 'severity', 'title', 'description', 'referenced_memory_id'. No markdown wrappers.
"""

        # ── Step 5: Groq LLM Execution with Fallback Model ──
        try:
            llm_response = groq_client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Review this diff:\n{safe_diff}"}
                ],
                temperature=0.2,
            )
            raw_output = llm_response.choices[0].message.content
        except (APIError, RateLimitError) as e:
            logger.warning(f"Primary model {MODEL_NAME} failed ({e}), falling back to {FALLBACK_MODEL}")
            yield f"data: {json.dumps({'step': 4.5, 'message': f'Primary model failed, falling back to {FALLBACK_MODEL}...'})}\n\n"
            llm_response = groq_client.chat.completions.create(
                model=FALLBACK_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Review this diff:\n{safe_diff}"}
                ],
                temperature=0.2,
            )
            raw_output = llm_response.choices[0].message.content

        # Tier 3 Error Handling: safe JSON extraction
        parsed_findings = safe_json_parse(raw_output)

        yield f"data: {json.dumps({'step': 5, 'message': 'Review Complete!', 'result': parsed_findings})}\n\n"

    except Exception as e:
        logger.error(f"Review stream error: {e}")
        yield f"data: {json.dumps({'status': 'error', 'message': f'Review stream fatal error: {str(e)}'})}\n\n"


@app.post("/review")
async def review_pr(request: Request):
    """
    Main webhook / API endpoint handling new PR Diff submissions.
    Streams progress using Server-Sent Events (SSE).
    """
    payload = await request.json()
    pr_diff = payload.get("diff", "")
    bank_id = payload.get("bank_id", "omni-review-bank")

    if not pr_diff:
        return {"error": "Missing 'diff' in request payload."}

    return StreamingResponse(
        execute_review_stream(pr_diff, bank_id),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    # Ready for production routing
    uvicorn.run(app, host="0.0.0.0", port=8000)

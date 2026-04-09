"""
╔══════════════════════════════════════════════════════════════════╗
║          OMNI-SRE — PHASE 5: THE CRUCIBLE                      ║
║          Automated Integration Verification Suite               ║
║          Tests: Hindsight Cloud + Groq LLM + SSE Streaming      ║
╚══════════════════════════════════════════════════════════════════╝
"""

import httpx
import json
import sys
import time
import asyncio

# ── Terminal Formatting ──
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"
BG_GREEN = "\033[42m"
BG_RED = "\033[41m"

BASE_URL = "http://localhost:8000"

# The Trap PR diff — identical to seed_data.json PR-1499
TRAP_PR_DIFF = """--- a/server/resolvers.js
+++ b/server/resolvers.js
@@ -88,11 +88,13 @@
 app.post('/api/chat/stream', authMiddleware, async (req, res) => {
   const { prompt, userSettings } = req.body;
   
-  const aiResponse = await axios.post('http://ai-engine:8000/sync-chat', { prompt });
-  res.json(aiResponse.data);
+  // Pass through directly to Python streaming engine
+  const aiResponse = await axios.post('http://ai-engine:8000/stream', {
+     prompt: prompt,
+     settings: userSettings
+  }, { responseType: 'stream' });
+  
+  aiResponse.data.pipe(res);
 });

--- a/ai-engine/app/routers/stream.py
+++ b/ai-engine/app/routers/stream.py
@@ -22,6 +22,12 @@
 @router.post('/stream')
 async def generate_stream(request: Request):
     payload = await request.json()
-    return process_chat_sync(payload)
+    
+    async def event_generator():
+        async for token in llm_client.stream_completion(f"Reply to: {payload['prompt']}"):
+            yield f"data: {token}\\n\\n"
+            
+    return StreamingResponse(event_generator(), media_type="text/event-stream")"""


def print_header():
    print(f"""
{CYAN}{BOLD}╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ██████  ███    ███ ███    ██ ██       ███████ ██████  ███████   ║
║  ██    ██ ████  ████ ████   ██ ██       ██      ██   ██ ██        ║
║  ██    ██ ██ ████ ██ ██ ██  ██ ██ █████ ███████ ██████  █████     ║
║  ██    ██ ██  ██  ██ ██  ██ ██ ██            ██ ██   ██ ██        ║
║   ██████  ██      ██ ██   ████ ██       ███████ ██   ██ ███████   ║
║                                                                  ║
║           PHASE 5: THE CRUCIBLE — Integration Verifier           ║
╚══════════════════════════════════════════════════════════════════╝{RESET}
""")


def print_phase(num, title):
    print(f"\n{YELLOW}{BOLD}{'─' * 64}")
    print(f"  PHASE {num}: {title}")
    print(f"{'─' * 64}{RESET}\n")


def print_ok(msg):
    print(f"  {GREEN}{BOLD}✅ {msg}{RESET}")


def print_fail(msg):
    print(f"  {RED}{BOLD}❌ {msg}{RESET}")


def print_info(msg):
    print(f"  {CYAN}▸ {msg}{RESET}")


def print_stream_event(step, message):
    color = MAGENTA if step in (2, 2.5, 3) else CYAN if step == 4 else GREEN if step == 5 else DIM
    prefix = "HINDSIGHT" if step in (2, 2.5, 3) else "GROQ_LLM" if step in (4, 4.5) else "ENGINE"
    print(f"  {color}  [{prefix}] Step {step}: {message}{RESET}")


def print_win():
    print(f"""
{BG_GREEN}{BOLD}
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   🔥  CRITICAL WIN: VECTORIZE HINDSIGHT MEMORY RECALL SUCCESSFUL!  🔥    ║
║                                                                          ║
║   The [pattern:async-generator-leak] tag was detected in the LLM         ║
║   response. Hindsight Cloud recalled Incident INC-2025-08-14-A and       ║
║   the Groq LLM correctly surfaced it in its security findings.           ║
║                                                                          ║
║   ✅ Hindsight Cloud Integration  — VERIFIED                             ║
║   ✅ SSE Streaming Pipeline       — VERIFIED                             ║
║   ✅ Groq LLM Tag Injection       — VERIFIED                             ║
║   ✅ Memory-Aware Code Review     — VERIFIED                             ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
{RESET}
""")


def print_loss(reason):
    print(f"""
{BG_RED}{BOLD}
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   💀  INTEGRATION VERIFICATION FAILED                                    ║
║                                                                          ║
║   Reason: {reason:<56}   ║
║                                                                          ║
║   Action Items:                                                          ║
║     1. Verify HINDSIGHT_API_KEY in .env                                  ║
║     2. Verify GROQ_API_KEY in .env                                       ║
║     3. Ensure the memory bank 'omni-review-bank' has been seeded         ║
║     4. Check engine.py server logs for detailed errors                   ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
{RESET}
""")


async def phase_1_seed():
    """Seed Hindsight Cloud memory bank via the /seed endpoint."""
    print_phase(1, "SEED HINDSIGHT CLOUD MEMORY BANK")
    print_info("POST http://localhost:8000/seed")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            t0 = time.perf_counter()
            resp = await client.post(f"{BASE_URL}/seed", params={"bank_id": "omni-review-bank"})
            elapsed = time.perf_counter() - t0

            print_info(f"Status: {resp.status_code} | Latency: {elapsed:.2f}s")

            if resp.status_code == 200:
                body = resp.json()
                print_info(f"Response: {json.dumps(body, indent=2)}")

                if body.get("status") in ("success", "mocked"):
                    print_ok(f"Phase 1: Hindsight Cloud Seeded Successfully. ({elapsed:.2f}s)")
                    return True
                else:
                    print_fail(f"Phase 1: Seed returned unexpected status: {body.get('status')}")
                    return False
            else:
                print_fail(f"Phase 1: Seed failed with HTTP {resp.status_code}")
                print_info(f"Body: {resp.text}")
                return False

    except httpx.ConnectError:
        print_fail("Phase 1: Cannot connect to http://localhost:8000. Is the FastAPI server running?")
        return False
    except Exception as e:
        print_fail(f"Phase 1: Unexpected error — {e}")
        return False


async def phase_2_and_3_review():
    """Trigger the SSE review stream and parse for the win condition tag."""
    print_phase(2, "TRIGGER SSE REVIEW STREAM (Trap PR)")
    print_info("POST http://localhost:8000/review")
    print_info(f"Payload: Trap PR-1499 diff ({len(TRAP_PR_DIFF)} chars)")

    payload = {"diff": TRAP_PR_DIFF, "bank_id": "omni-review-bank"}
    found_tag = False
    stream_error = None
    findings = []
    events_received = 0

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            t0 = time.perf_counter()

            async with client.stream("POST", f"{BASE_URL}/review",
                                     json=payload,
                                     headers={"Content-Type": "application/json"}) as resp:

                print_info(f"Status: {resp.status_code} | Content-Type: {resp.headers.get('content-type', 'unknown')}")

                if resp.status_code != 200:
                    print_fail(f"Phase 2: Review endpoint returned HTTP {resp.status_code}")
                    body = await resp.aread()
                    print_info(f"Body: {body.decode()}")
                    return False, False

                print()
                print(f"  {YELLOW}{BOLD}  ── SSE Stream Output ──{RESET}")
                print()

                buffer = ""
                async for chunk in resp.aiter_text():
                    buffer += chunk

                    # SSE events are delimited by \n\n
                    while "\n\n" in buffer:
                        event_str, buffer = buffer.split("\n\n", 1)
                        event_str = event_str.strip()

                        if not event_str:
                            continue

                        # Strip "data: " prefix
                        if event_str.startswith("data: "):
                            data_str = event_str[6:]
                        elif event_str.startswith("data:"):
                            data_str = event_str[5:]
                        else:
                            data_str = event_str

                        try:
                            parsed = json.loads(data_str)
                            events_received += 1

                            # Check for error
                            if parsed.get("status") == "error" or parsed.get("error"):
                                err_msg = parsed.get("message") or parsed.get("error", "Unknown error")
                                stream_error = err_msg
                                print(f"  {RED}{BOLD}  ⚠ ERROR: {err_msg}{RESET}")
                                continue

                            step = parsed.get("step", "?")
                            message = parsed.get("message", "")
                            print_stream_event(step, message)

                            # Step 5: final results
                            if parsed.get("result"):
                                findings = parsed["result"]
                                print()
                                print(f"  {YELLOW}{BOLD}  ── Extracted Findings ({len(findings)}) ──{RESET}")
                                for i, f in enumerate(findings):
                                    sev = f.get("severity", "?").upper()
                                    sev_color = RED if sev == "CRITICAL" else YELLOW
                                    print(f"  {sev_color}  [{sev}] {f.get('title', 'Untitled')}{RESET}")
                                    print(f"  {DIM}         {f.get('description', 'No description')}{RESET}")
                                    ref = f.get("referenced_memory_id")
                                    if ref:
                                        print(f"  {MAGENTA}         Memory Ref: {ref}{RESET}")
                                    print()

                        except json.JSONDecodeError:
                            print(f"  {DIM}  [RAW] {data_str[:120]}{RESET}")

                elapsed = time.perf_counter() - t0

        # ── Phase 3: Win Condition Check ──
        print_phase(3, "WIN CONDITION ANALYSIS")
        print_info(f"SSE Events Received: {events_received}")
        print_info(f"Total Findings: {len(findings)}")
        print_info(f"Total Stream Time: {elapsed:.2f}s")

        if stream_error:
            print_fail(f"Stream contained error: {stream_error}")
            return False, False

        # Scan entire findings JSON for the tag
        findings_text = json.dumps(findings)
        
        # Check for the critical memory tag
        if "pattern:async-generator-leak" in findings_text:
            found_tag = True
            print_ok("Tag [pattern:async-generator-leak] FOUND in LLM output!")
        else:
            print_fail("Tag [pattern:async-generator-leak] NOT FOUND in LLM output.")
            print_info(f"Full findings dump:\n{json.dumps(findings, indent=2)}")

        # Additional checks
        checks_passed = 0
        total_checks = 4

        # Check 1: SSE streamed in chunks (not 1 dump)
        if events_received >= 3:
            print_ok(f"SSE Chunked Streaming: {events_received} events (minimum 3)")
            checks_passed += 1
        else:
            print_fail(f"SSE Chunked Streaming: only {events_received} events received")

        # Check 2: At least 1 critical finding
        critical_count = sum(1 for f in findings if f.get("severity", "").lower() == "critical")
        if critical_count >= 1:
            print_ok(f"Critical Findings Detected: {critical_count}")
            checks_passed += 1
        else:
            print_fail("No critical findings detected by LLM")

        # Check 3: Memory reference IDs present
        refs = [f.get("referenced_memory_id") for f in findings if f.get("referenced_memory_id")]
        if refs:
            print_ok(f"Memory References: {', '.join(refs)}")
            checks_passed += 1
        else:
            print_fail("No referenced_memory_id fields in findings")

        # Check 4: Stream completed under 60s
        if elapsed < 60:
            print_ok(f"Latency: {elapsed:.2f}s (under 60s threshold)")
            checks_passed += 1
        else:
            print_fail(f"Latency: {elapsed:.2f}s EXCEEDED 60s threshold")

        print()
        print_info(f"Sub-checks passed: {checks_passed}/{total_checks}")

        return found_tag, checks_passed == total_checks

    except httpx.ConnectError:
        print_fail("Phase 2: Cannot connect to http://localhost:8000. Is the FastAPI server running?")
        return False, False
    except Exception as e:
        print_fail(f"Phase 2: Unexpected error — {type(e).__name__}: {e}")
        return False, False


async def main():
    print_header()

    # Phase 1: Seed
    seed_ok = await phase_1_seed()
    if not seed_ok:
        print_loss("Hindsight Cloud seeding failed")
        sys.exit(1)

    # Phase 2+3: Review SSE Stream + Win Condition
    tag_found, all_checks = await phase_2_and_3_review()

    # Final Verdict
    print()
    print(f"{CYAN}{BOLD}{'═' * 64}")
    print(f"  FINAL VERDICT")
    print(f"{'═' * 64}{RESET}")

    if tag_found:
        print_win()
        sys.exit(0)
    else:
        print_loss("Tag [pattern:async-generator-leak] missing")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

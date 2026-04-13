import os
import json
import asyncio
import hmac
import hashlib
import httpx
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Depends, Security, BackgroundTasks, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import AsyncGroq
from supabase import create_client, Client, ClientOptions
from sentence_transformers import SentenceTransformer

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("omni-sre")

# Load environment variables from both root and client directories
root_env = os.path.join(os.path.dirname(__file__), '..', '.env')
client_env = os.path.join(os.path.dirname(__file__), '..', 'client', '.env')
load_dotenv(root_env)
load_dotenv(client_env)

# Global state for AI model
ai_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load AI model on startup
    print("Loading HuggingFace sentence-transformer model (all-MiniLM-L6-v2)...")
    try:
        ai_models["embedding"] = SentenceTransformer("all-MiniLM-L6-v2")
        print("Embedding model loaded successfully.")
    except Exception as e:
        print(f"CRITICAL: Failed to load embedding model: {e}")
    yield
    # Clean up on shutdown
    ai_models.clear()

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Omni-SRE Brain", 
    description="AI Code Review Engine",
    lifespan=lifespan
)

# Strict CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set in the environment.")
groq_client = AsyncGroq(api_key=GROQ_API_KEY)

# Initialize Supabase Client
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    # Admin client explicitly bypasses RLS for system maintenance tasks
    admin_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_SERVICE_ROLE_KEY else supabase
else:
    print("WARNING: Supabase credentials not found in environment.")
    supabase = None
    admin_supabase = None

# Authentication Dependency
security = HTTPBearer()

async def verify_tenant_auth(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not supabase:
        # If running in a mock test environment without supabase credentials, skip hard auth or mock it.
        # But for exact testing, we will mock supabase.auth.get_user in pytest.
        pass
    token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid auth token")
        return {"user": user_response.user, "token": token}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

class ReviewRequest(BaseModel):
    workspace_id: str
    diff: str
    pr_context: str = ""

async def stream_groq_review(workspace_id: str, diff: str, pr_context: str, supabase_client: Client = None):
    try:
        # Verify model is loaded
        if "embedding" not in ai_models:
            yield f"data: {json.dumps({'error': 'AI Model still loading. Please retry in 30 seconds.'})}\n\n"
            return

        # ── Step 1: PGVector Memory Recall (RAG) ──
        yield f"data: {json.dumps({'content': '', 'system_msg': 'Generating embeddings for code diff...'})}\n\n"
        await asyncio.sleep(0.1)
        
        memories = []
        if supabase_client:
            try:
                # Generate embedding vector for the diff
                diff_vector = ai_models["embedding"].encode(diff[:2000]).tolist()
                
                yield f"data: {json.dumps({'content': '', 'system_msg': 'Querying Supabase pgvector for past incidents...'})}\n\n"
                
                response = supabase_client.rpc("match_memories", {
                    "query_embedding": diff_vector,
                    "target_workspace_id": workspace_id,
                    "match_threshold": -1.0,  # Bypasses all threshold filters, strictly returns top 3
                    "match_count": 5  # Expanded count to compensate for poor Code-to-Text alignment
                }).execute()

                if response.data:
                    memories = [{"text": m.get("content", ""), "source": f"Vector [{m.get('similarity', 0):.2f}]"} for m in response.data]
            except Exception as e:
                print(f"[FATAL DB ERROR] Vector recall failed: {str(e)}")
                
            # ── THE ABSOLUTE FAILSAFE: Fallback to standard CRUD Query ──
            if not memories:
                yield f"data: {json.dumps({'content': '', 'system_msg': 'Vector query returned NULL. Triggering absolute CRUD fallback...'})}\n\n"
                try:
                    fallback_res = supabase_client.table('incidents').select('*').eq('workspace_id', workspace_id).order('created_at', desc=True).limit(3).execute()
                    if fallback_res.data:
                        memories = [{"text": f"Incident {m.get('id', 'Unknown')}: {m.get('title', 'Untitled')} - {m.get('description', '')}", "source": "CRUD Fallback"} for m in fallback_res.data]
                        yield f"data: {json.dumps({'content': '', 'system_msg': f'Fallback Success: Found {len(memories)} recent incidents.'})}\n\n"
                    else:
                        yield f"data: {json.dumps({'content': '', 'system_msg': 'No incidents logged in this workspace yet.'})}\n\n"
                except Exception as ex:
                    print(f"CRUD Fallback Error: {ex}")
        
        # Format memories for the prompt
        memory_block = "\n".join([f"- [{m['source']}] {m['text']}" for m in memories]) if memories else "No specific memory available."

        # ── Step 2: Construct the System and User Prompts ──
        system_prompt = f"""You are a Senior Staff Security Engineer and Principal SRE. Review this code. Be highly critical, concise, and prioritize security, performance, and best practices.

CRITICAL CONTEXT FROM PAST INCIDENTS (INSTITUTIONAL MEMORY):
{memory_block}

If the code violates these past incidents, you MUST explicitly mention the Incident ID and the team rule. Adhere strictly to these institutional conventions."""

        user_prompt = f"""
        ### PULL REQUEST CONTEXT:
        {pr_context}

        ### CODE DIFF:
        {diff}
        """

        yield f"data: {json.dumps({'content': '', 'system_msg': 'Generating secure code review...'})}\n\n"

        # ── Step 3: Stream Groq API ──
        stream = await groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            model="llama-3.1-8b-instant", # Updated model because llama3-8b-8192 is decommissioned
            temperature=0.2,
            stream=True
        )

        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                # SSE Format: data: {payload}\n\n
                payload = json.dumps({"content": content})
                yield f"data: {payload}\n\n"
        
        # Signal completion with metrics
        stats = {
            "findings_count": len(memories), # Placeholder metric
            "memoryRecallCount": len(memories),
            "status": "completed"
        }
        yield f"data: {json.dumps({'content': '', 'done': True, 'stats': stats})}\n\n"

    except Exception as e:
        print(f"Error streaming from Groq: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/api/review/stream")
async def review_stream(request: ReviewRequest, user=Depends(verify_tenant_auth)):
    if not request.diff:
        raise HTTPException(status_code=400, detail="Code diff is required")
        
    if len(request.diff) > 10000:
        raise HTTPException(status_code=413, detail="Payload Too Large: Diff exceeds 10,000 characters")

    print(f"[BRAIN] Starting review for workspace: {request.workspace_id}")

    # Tenant Validation (Ensure user owns/has access to the workspace via RLS)
    if supabase and user:
        try:
            token = user["token"]
            
            # Instantiate a request-scoped client to safely pass RLS policies
            scoped_options = ClientOptions(headers={"Authorization": f"Bearer {token}"})
            scoped_supabase = create_client(SUPABASE_URL, SUPABASE_KEY, options=scoped_options)
            
            workspace_check = scoped_supabase.table('workspaces').select('id').eq('id', request.workspace_id).execute()
            if not workspace_check.data:
                raise HTTPException(status_code=403, detail="Forbidden: You do not have access to this workspace.")
        except HTTPException:
            raise
        except Exception as e:
            # Postgres UUID errors or network
            raise HTTPException(status_code=403, detail=("Forbidden: Invalid workspace or access denied. Error: " + str(e)))

    return StreamingResponse(
        stream_groq_review(
            workspace_id=request.workspace_id, 
            diff=request.diff, 
            pr_context=request.pr_context,
            supabase_client=scoped_supabase
        ),
        media_type="text/event-stream"
    )

@app.post("/api/memories/embed-pending")
async def backfill_embeddings():
    """
    Background API to find NULL embedding rows in `incidents` and generate vectors.
    Uses the Admin Client to bypass RLS limits during batch processing.
    """
    if "embedding" not in ai_models:
        raise HTTPException(status_code=503, detail="Embedding model not loaded yet. Wait for boot.")

    if not admin_supabase:
        raise HTTPException(status_code=500, detail="Database client not initialized")
        
    try:
        # Check for NULL embeddings
        res = admin_supabase.table('incidents').select('id', 'title', 'description').is_('embedding', 'null').execute()
        pending_rows = res.data
        
        if not pending_rows:
            return {"status": "success", "message": "All database memory rows are fully vectorized.", "processed": 0}
            
        processed_count = 0
        for row in pending_rows:
            # Combine incident content into a rich dense knowledge graph
            context_string = f"Memory ID: {row.get('id', '')} Title: {row.get('title', '')} Details: {row.get('description', '')}"
            if len(context_string.strip()) < 15:
                continue
                
            vector = ai_models["embedding"].encode(context_string[:2000]).tolist()
            
            # Persist vector
            admin_supabase.table('incidents').update({"embedding": vector}).eq('id', row['id']).execute()
            processed_count += 1
            
        return {"status": "success", "processed": processed_count}
        
    except Exception as e:
        print(f"[FATAL BACKFILL ERROR]: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "healthy", "model_ready": "embedding" in ai_models}

# ═══════ GITHUB ASYNCHRONOUS WORKER PIPELINE ═══════

async def process_github_pr(diff_url: str, comments_url: str, webhook_data: dict, workspace_id: str, created_by: str):
    """
    Background worker that runs the full RAG protocol asynchronously and posts to GitHub.
    """
    GITHUB_TOKEN = os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN")
    if not GITHUB_TOKEN:
        print("[WEBHOOK ERROR] GITHUB_PERSONAL_ACCESS_TOKEN is missing in .env")
        return

    print(f"[GITHUB WORKER] Starting AI Review for PR {diff_url}...", flush=True)
    headers = {
        "Authorization": f"token {GITHUB_TOKEN.strip()}", 
        "Accept": "application/vnd.github.v3.diff"
    }

    # Transform diff_url to API URL if it's a web URL
    api_diff_url = diff_url
    if "github.com/" in diff_url and "/pull/" in diff_url and "api.github.com" not in diff_url:
        # Example: https://github.com/user/repo/pull/1.diff -> https://api.github.com/repos/user/repo/pulls/1
        api_diff_url = diff_url.replace("github.com/", "api.github.com/repos/").replace("/pull/", "/pulls/").replace(".diff", "")

    async with httpx.AsyncClient(follow_redirects=True) as client:
        # 1. Fetch RAW Diff using API credentials
        logger.info(f"[GITHUB WORKER] Fetching diff from {api_diff_url}...")
        diff_res = await client.get(api_diff_url, headers=headers)
        if diff_res.status_code != 200:
            logger.error(f"[WEBHOOK ERROR] Failed to fetch diff. HTTP {diff_res.status_code} - Link: {api_diff_url}")
            return
            
        raw_diff = diff_res.text
        if len(raw_diff.strip()) < 10:
            print("[WEBHOOK INFO] Trivial diff ignored.")
            return

        pr_info = webhook_data.get("pull_request", {})
        sender_info = webhook_data.get("sender", {})
        pr_context = f"GitHub PR #{pr_info.get('number')} - {pr_info.get('title')} triggered by user {sender_info.get('login')}\nLink: {pr_info.get('html_url')}"

        # 2. Extract Agentic Memory using Admin Service Client
        memories = []
        try:
            diff_vector = ai_models["embedding"].encode(raw_diff[:2000]).tolist()
            response = admin_supabase.rpc("match_memories", {
                "query_embedding": diff_vector,
                "target_workspace_id": workspace_id,
                "match_threshold": -1.0,
                "match_count": 5
            }).execute()

            if response.data:
                memories = [{"text": m.get("content", ""), "source": f"Vector [{m.get('similarity', 0):.2f}]"} for m in response.data]
        except Exception as e:
            print(f"[FATAL DB MEMORY ERROR] Vector lookup failed: {str(e)}")

        # Webhook Fallback
        if not memories:
            try:
                fallback_res = admin_supabase.table('incidents').select('*').eq('workspace_id', workspace_id).order('created_at', desc=True).limit(3).execute()
                if fallback_res.data:
                    memories = [{"text": f"Incident {m.get('id', 'Unknown')}: {m.get('title', 'Untitled')} - {m.get('description', '')}", "source": "CRUD Fallback"} for m in fallback_res.data]
            except Exception as ex:
                pass
                
        memory_block = "\n".join([f"- [{m['source']}] {m['text']}" for m in memories]) if memories else "No specific memory available."
        
        system_prompt = f"""You are a Senior Staff Security Engineer and Principal SRE. Review this code. Be highly critical, concise, and prioritize security, performance, and best practices.

CRITICAL CONTEXT FROM PAST INCIDENTS (INSTITUTIONAL MEMORY):
{memory_block}

If the code violates these past incidents, you MUST explicitly mention the Incident ID and the team rule. Adhere strictly to these institutional conventions."""

        # 3. Synchronous LLM Generation
        try:
            print("[GITHUB WORKER] Firing Groq Request for AI Review...", flush=True)
            groq_res = await groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Context: {pr_context}\n\nDiff:\n{raw_diff}"}
                ],
                model="llama-3.1-8b-instant",
                temperature=0.2,
                stream=False
            )
            review_markdown = groq_res.choices[0].message.content
        except Exception as e:
            print(f"[WEBHOOK ERROR] Groq LLM failure: {str(e)}")
            return

        # 4. Post Full Review Back to GitHub
        print("[GITHUB WORKER] Publishing results to GitHub Comments URL...", flush=True)
        post_url = comments_url
        headers_post = {
            "Authorization": f"token {GITHUB_TOKEN.strip()}", 
            "Accept": "application/vnd.github.v3+json"
        }
        
        payload = {
            "body": f"### 🧩 Omni-SRE Agentic Code Review\n\n**Institutional Context Modeled**: `{len(memories)} memories`\n\n" + review_markdown
        }
        
        post_res = await client.post(post_url, headers=headers_post, json=payload)
        
        # 5. SYNC AUDIT LOG TO DB DASHBOARD
        print(f"[DB SYNC DEPCHECK] workspace_id: {workspace_id} | created_by: {created_by}", flush=True)
        
        if not workspace_id or not created_by:
            print("[DB INSERT FATAL] Refusing to insert review. Found NULL Identity (Workspace or Owner missing).", flush=True)
            return

        try:
            review_entry = {
                "workspace_id": workspace_id,
                "created_by": created_by,
                "pr_url": pr_info.get("html_url"),
                "pr_number": str(pr_info.get("number", "Unknown")),
                "pr_title": pr_info.get("title", f"PR #{pr_info.get('number', '??')}"),
                "status": "completed",
                "findings_count": len(memories),
                "result": {
                    "ai_feedback": review_markdown, 
                    "memories_sourced": len(memories),
                    "findings": [{"id": i, "severity": "critical" if i==0 else "medium"} for i in range(len(memories))] 
                }
            }
            res = admin_supabase.table('reviews').insert(review_entry).execute()
            print(f"[DB INSERT SUCCESS] Review persisted for PR #{pr_info.get('number')}. Row ID: {res.data[0].get('id') if res.data else 'Check DB'}", flush=True)
        except Exception as e:
            print(f"[DB INSERT FATAL] Exception: {str(e)}", flush=True)
            # Log full stack or response if possible
            if hasattr(e, 'message'):
                print(f"[DB ERROR DETAIL] {e.message}", flush=True)
        
        if post_res.status_code == 201:
            print("[GITHUB WORKER SUCCESS] Posted AI Review to GitHub successfully.")
        else:
            print(f"[GITHUB WORKER FAIL] Could not post to GitHub. HTTP {post_res.status_code}: {post_res.text}")


@app.post("/api/github/webhook")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str = Header(None)
):
    GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")
    
    # Optional Bypass for uncontrolled environments
    if not GITHUB_WEBHOOK_SECRET:
        print("[WEBHOOK WARN] Processing payload without cryptographic validation (Secret missing).")
    else:
        GITHUB_WEBHOOK_SECRET = GITHUB_WEBHOOK_SECRET.strip()
        if not x_hub_signature_256:
            raise HTTPException(status_code=401, detail="Unauthorized: Missing cryptographic signature header")
            
        payload_bytes = await request.body()
        
        # Build HMAC SHA-256 baseline
        mac = hmac.new(GITHUB_WEBHOOK_SECRET.encode('utf-8'), msg=payload_bytes, digestmod=hashlib.sha256)
        expected_signature = "sha256=" + mac.hexdigest()
        
        if not hmac.compare_digest(expected_signature, x_hub_signature_256):
            print(f"[WEBHOOK FATAL] Intrusion attempt stopped. Signature mismatch. Expected: {expected_signature} | Got: {x_hub_signature_256}")
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid signature")

    data = await request.json()
    action = data.get("action")
    
    # We only care when code changes or opens
    if action not in ["opened", "synchronize", "reopened"]:
        return {"status": "ignored", "reason": f"Webhooks action '{action}' is not tracked API event."}

    pr = data.get("pull_request", {})
    diff_url = pr.get("diff_url")
    comments_url = pr.get("comments_url")
    
    if diff_url and comments_url:
        # Extract the repository full name (e.g., "owner/repo")
        repo_full_name = data.get("repository", {}).get("full_name")
        
        workspace_id = None
        created_by = None
        
        if admin_supabase and repo_full_name:
            try:
                # Resolve workspace from the mapping table
                settings_res = admin_supabase.table('workspace_settings').select('workspace_id').eq('github_repo_full_name', repo_full_name).execute()
                
                if settings_res.data:
                    workspace_id = settings_res.data[0]['workspace_id']
                    
                    # Fetch owner_id to associate the review with the workspace owner
                    ws_res = admin_supabase.table('workspaces').select('created_by').eq('id', workspace_id).execute()
                    if ws_res.data:
                        created_by = ws_res.data[0]['created_by']
                else:
                    logger.warning(f"[WEBHOOK WARN] No workspace mapping found for repository: {repo_full_name}")
                    # Fallback to latest workspace for development/debugging if desired, 
                    # but typically we'd stop here in production.
                    ws_check = admin_supabase.table('workspaces').select('id, created_by').order('created_at', descending=True).limit(1).execute()
                    if ws_check.data:
                        workspace_id = ws_check.data[0]['id']
                        created_by = ws_check.data[0]['created_by']
                        
            except Exception as e:
                logger.error(f"[WEBHOOK ERROR] Repository resolution failed: {str(e)}")

        # Dispatch Asynchronous Handoff so Webhook HTTP connection doesn't timeout natively
        if workspace_id and created_by:
            background_tasks.add_task(process_github_pr, diff_url, comments_url, data, workspace_id, created_by)
            logger.info(f"[WEBHOOK ACCEPT] PR analysis for {repo_full_name} dispatched to workspace {workspace_id}")
        else:
            logger.error("[WEBHOOK FATAL] Could not resolve workspace for this repository. Aborting.")
            
    return {"status": "accepted"}

# Run with: uvicorn main:app --reload --port 8000

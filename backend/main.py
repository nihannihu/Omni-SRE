import os
import json
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import AsyncGroq
from supabase import create_client, Client, ClientOptions
from sentence_transformers import SentenceTransformer

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

# Run with: uvicorn main:app --reload --port 8000

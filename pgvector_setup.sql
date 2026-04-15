-- ═══════════════════════════════════════════════════════════════
-- OMNI-SRE: VECTOR MEMORY PROTOCOL (PGVECTOR SETUP)
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- STEP 2: Create a dedicated Hindsight Memory table for semantic search
-- Using vector(384) because we will use the lightning-fast all-MiniLM-L6-v2 HuggingFace model
CREATE TABLE IF NOT EXISTS public.hindsight_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,         -- The raw text of the incident or rule
    type TEXT NOT NULL,            -- e.g., 'incident', 'convention'
    embedding VECTOR(384),         -- The semantic vector
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Note: We can also alter the incidents table, but keeping a dedicated vector table is better 
-- for separating standard CRUD metrics from pure semantic search context.

-- STEP 3: Setup RLS
ALTER TABLE public.hindsight_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hm_select" ON public.hindsight_memory
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE created_by = auth.uid()
    )
);

CREATE POLICY "hm_insert" ON public.hindsight_memory
FOR INSERT WITH CHECK (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE created_by = auth.uid()
    )
);

-- STEP 4: Create the similarity search function (RPC)
-- This function calculates the Cosine Distance (<=>)
CREATE OR REPLACE FUNCTION match_memories(
    query_embedding VECTOR(384),
    target_workspace_id UUID,
    match_threshold FLOAT,
    match_count INT
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        hm.id,
        hm.content,
        1 - (hm.embedding <=> query_embedding) AS similarity
    FROM public.hindsight_memory hm
    WHERE hm.workspace_id = target_workspace_id
      AND 1 - (hm.embedding <=> query_embedding) > match_threshold
    ORDER BY hm.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

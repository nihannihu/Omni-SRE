-- ═══════════════════════════════════════════════════════════════
-- OMNI-SRE: CREATE REVIEWS TABLE
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: Create Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    pr_url TEXT,
    pr_number TEXT,
    pr_title TEXT,
    status TEXT DEFAULT 'pending',
    findings_count INTEGER DEFAULT 0,
    result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 2: Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create RLS Policies (One-Way Dependency Graph)
-- Note: These mirror the incidents policies. They check the workspaces table.

-- DROP if they exist to be safe
DROP POLICY IF EXISTS "rev_select" ON public.reviews;
DROP POLICY IF EXISTS "rev_insert" ON public.reviews;

-- SELECT: You can see reviews in workspaces you created
CREATE POLICY "rev_select" ON public.reviews
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE created_by = auth.uid()
    )
);

-- INSERT: You can insert reviews into workspaces you created
CREATE POLICY "rev_insert" ON public.reviews
FOR INSERT WITH CHECK (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE created_by = auth.uid()
    )
);

-- VERIFY
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'reviews' AND schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════
-- OMNI-SRE: WORKSPACE SETTINGS & REPO MAPPING
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: Create the Mapping Table
CREATE TABLE IF NOT EXISTS public.workspace_settings (
    workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    github_repo_full_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 2: Enable RLS (Read-only by workspace members)
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON public.workspace_settings
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE created_by = auth.uid()
    )
);

-- STEP 3: Create Index for Webhook Throughput
CREATE INDEX IF NOT EXISTS idx_repo_name ON public.workspace_settings (github_repo_full_name);

-- STEP 4: Seed Initial Mapping
-- Replace 'nihannihu/Omni-SRE' with your repo if different.
-- We use a subquery to find the most recent workspace.
INSERT INTO public.workspace_settings (workspace_id, github_repo_full_name)
SELECT id, 'nihannihu/Omni-SRE'
FROM public.workspaces
ORDER BY created_at DESC
LIMIT 1
ON CONFLICT (workspace_id) DO UPDATE SET github_repo_full_name = EXCLUDED.github_repo_full_name;

-- VERIFY
SELECT * FROM public.workspace_settings;

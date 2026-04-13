-- ═══════════════════════════════════════════════════════════════════
-- OMNI-SRE: NUCLEAR RLS RESET — COPY THIS ENTIRE BLOCK AND RUN IT
-- IN YOUR SUPABASE SQL EDITOR. THIS IS THE ONLY PATCH YOU WILL EVER
-- NEED. IT DROPS EVERYTHING AND STARTS CLEAN.
-- ═══════════════════════════════════════════════════════════════════

-- ═══════ STEP 1: NUKE ALL EXISTING POLICIES ═══════
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on workspaces
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspaces' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspaces', pol.policyname);
    END LOOP;
    
    -- Drop all policies on workspace_members
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspace_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspace_members', pol.policyname);
    END LOOP;
    
    -- Drop all policies on incidents
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'incidents' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.incidents', pol.policyname);
    END LOOP;
END $$;

-- ═══════ STEP 2: NUKE OLD TRIGGERS ═══════
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
DROP FUNCTION IF EXISTS public.handle_new_workspace();

-- ═══════ STEP 3: RECREATE CLEAN POLICIES ═══════

-- WORKSPACES: SELECT — user can see if they created it OR are a member
CREATE POLICY "ws_select" ON public.workspaces FOR SELECT USING (
    created_by = auth.uid()
    OR id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

-- WORKSPACES: INSERT — user can create if they set created_by to themselves
CREATE POLICY "ws_insert" ON public.workspaces FOR INSERT WITH CHECK (
    created_by = auth.uid()
);

-- WORKSPACES: UPDATE — creator or admin member can update
CREATE POLICY "ws_update" ON public.workspaces FOR UPDATE USING (
    created_by = auth.uid()
    OR id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- WORKSPACE_MEMBERS: SELECT — user can see their own memberships
CREATE POLICY "wm_select" ON public.workspace_members FOR SELECT USING (
    user_id = auth.uid()
);

-- WORKSPACE_MEMBERS: INSERT — user can add themselves
CREATE POLICY "wm_insert" ON public.workspace_members FOR INSERT WITH CHECK (
    user_id = auth.uid()
);

-- INCIDENTS: SELECT — user can see incidents in their workspaces
CREATE POLICY "inc_select" ON public.incidents FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE created_by = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
);

-- INCIDENTS: INSERT — user can insert incidents in their workspaces
CREATE POLICY "inc_insert" ON public.incidents FOR INSERT WITH CHECK (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE created_by = auth.uid()
        UNION
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
);

-- ═══════ DONE ═══════
-- Verify with: SELECT * FROM pg_policies WHERE schemaname = 'public';

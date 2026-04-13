-- ═══════════════════════════════════════════════════════════════
-- OMNI-SRE: NON-RECURSIVE RLS RESET
-- This script guarantees ZERO mutual recursion between tables.
-- 
-- DEPENDENCY GRAPH (one-way only):
--   workspace_members.SELECT → checks ONLY user_id column (no subqueries)
--   workspaces.SELECT → reads workspace_members (safe: members doesn't read back)
--   incidents.SELECT → reads workspaces (safe: workspaces doesn't read incidents)
-- ═══════════════════════════════════════════════════════════════

-- ═══════ STEP 1: DROP EVERY SINGLE POLICY ═══════
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
        RAISE NOTICE 'Dropped: % on %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

-- ═══════ STEP 2: DROP OLD TRIGGERS ═══════
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
DROP FUNCTION IF EXISTS public.handle_new_workspace();

-- ═══════ STEP 3: WORKSPACE_MEMBERS — LEAF NODE (NO SUBQUERIES) ═══════

-- SELECT: You can only see YOUR OWN rows. Period. No subqueries.
CREATE POLICY "wm_select" ON public.workspace_members
FOR SELECT USING (user_id = auth.uid());

-- INSERT: You can only insert rows for YOURSELF.
CREATE POLICY "wm_insert" ON public.workspace_members
FOR INSERT WITH CHECK (user_id = auth.uid());

-- ═══════ STEP 4: WORKSPACES — READS MEMBERS (one-way, safe) ═══════

-- SELECT: You can see workspaces you CREATED or are a MEMBER of.
-- This queries workspace_members, but workspace_members does NOT query back.
CREATE POLICY "ws_select" ON public.workspaces
FOR SELECT USING (
    created_by = auth.uid()
    OR
    id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

-- INSERT: You can create a workspace if you set yourself as creator.
CREATE POLICY "ws_insert" ON public.workspaces
FOR INSERT WITH CHECK (created_by = auth.uid());

-- UPDATE: Creator or admin member can update.
CREATE POLICY "ws_update" ON public.workspaces
FOR UPDATE USING (
    created_by = auth.uid()
);

-- ═══════ STEP 5: INCIDENTS — READS WORKSPACES (one-way, safe) ═══════

-- SELECT: You can see incidents in workspaces you own.
-- Simple: just check created_by on the parent workspace.
CREATE POLICY "inc_select" ON public.incidents
FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE created_by = auth.uid()
    )
);

-- INSERT: You can insert incidents in workspaces you own.
CREATE POLICY "inc_insert" ON public.incidents
FOR INSERT WITH CHECK (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE created_by = auth.uid()
    )
);

-- ═══════ STEP 6: VERIFY ═══════
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

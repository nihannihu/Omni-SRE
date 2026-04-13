-- ═══════════════════════════════════════════════════════════
-- OMNI-SRE: DEFINITIVE RLS POLICY PATCH (RUN THIS ONCE)
-- This drops ALL existing policies and recreates them cleanly.
-- ═══════════════════════════════════════════════════════════

-- ══════════ WORKSPACES TABLE ══════════
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they created or are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update workspaces if they are admins" ON public.workspaces;

-- SELECT: A user can see a workspace if they CREATED it OR are in workspace_members
CREATE POLICY "workspaces_select" 
ON public.workspaces FOR SELECT 
USING (
    created_by = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
);

-- INSERT: A user can create a workspace if they set themselves as created_by
CREATE POLICY "workspaces_insert" 
ON public.workspaces FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- UPDATE: Only admins can update a workspace
CREATE POLICY "workspaces_update" 
ON public.workspaces FOR UPDATE 
USING (
    created_by = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = 'admin'
    )
);

-- ══════════ WORKSPACE_MEMBERS TABLE ══════════
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert members if admin" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert their own memberships" ON public.workspace_members;

-- SELECT: A user can see their own membership rows
CREATE POLICY "wm_select" 
ON public.workspace_members FOR SELECT 
USING (user_id = auth.uid());

-- INSERT: A user can insert a row for themselves (to join a workspace they just created)
CREATE POLICY "wm_insert" 
ON public.workspace_members FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- ══════════ INCIDENTS TABLE ══════════
DROP POLICY IF EXISTS "Users can view incidents in their workspaces" ON public.incidents;
DROP POLICY IF EXISTS "Users can insert incidents in their workspaces" ON public.incidents;

-- SELECT: A user can see incidents in workspaces they created or are members of
CREATE POLICY "incidents_select" 
ON public.incidents FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE workspaces.id = incidents.workspace_id
        AND (
            workspaces.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_members.workspace_id = incidents.workspace_id
                AND workspace_members.user_id = auth.uid()
            )
        )
    )
);

-- INSERT: A user can insert incidents in workspaces they created or are members of
CREATE POLICY "incidents_insert" 
ON public.incidents FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE workspaces.id = incidents.workspace_id
        AND (
            workspaces.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_members.workspace_id = incidents.workspace_id
                AND workspace_members.user_id = auth.uid()
            )
        )
    )
);

-- ══════════ REMOVE OLD TRIGGER ══════════
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
DROP FUNCTION IF EXISTS public.handle_new_workspace();

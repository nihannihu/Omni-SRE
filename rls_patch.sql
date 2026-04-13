-- 1. FIX WORKSPACE_MEMBERS POLICIES
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert members if admin" ON public.workspace_members;

CREATE POLICY "Users can view their own memberships" 
ON public.workspace_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own memberships" 
ON public.workspace_members 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 2. FIX WORKSPACES POLICIES (Safety recreation to bind to the new non-recursive member checking)
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update workspaces if they are admins" ON public.workspaces;

CREATE POLICY "Users can view workspaces they are members of" 
ON public.workspaces 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create workspaces" 
ON public.workspaces 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update workspaces if they are admins" 
ON public.workspaces 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = 'admin'
    )
);

-- 3. REMOVE THE TRIGGER (Moving logic directly to the React application)
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
DROP FUNCTION IF EXISTS public.handle_new_workspace();

-- FIX WORKSPACES SELECT POLICY
-- Dropping the previous select policy
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;

-- Creating the correct select policy that allows creators to see the workspace DURING the insert transaction before they are added as members.
CREATE POLICY "Users can view workspaces they created or are members of" 
ON public.workspaces 
FOR SELECT 
USING (
    created_by = auth.uid() 
    OR 
    EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
);

-- Re-create the INSERT policy just in case it was missing
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
CREATE POLICY "Users can create workspaces" 
ON public.workspaces 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

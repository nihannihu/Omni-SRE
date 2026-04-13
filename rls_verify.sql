-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION: Run this AFTER rls_nuclear_reset.sql
-- This confirms the workspace_members INSERT policy exists.
-- If it already exists (from the nuclear reset), Postgres will
-- report "policy already exists" which is fine.
-- ═══════════════════════════════════════════════════════════════

-- Ensure the INSERT policy for workspace_members exists
DO $$
BEGIN
    -- Try to create it; if it already exists, catch the error
    BEGIN
        CREATE POLICY "wm_insert" ON public.workspace_members 
        FOR INSERT WITH CHECK (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Policy wm_insert already exists — OK';
    END;
END $$;

-- VERIFY: List all active policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, cmd;

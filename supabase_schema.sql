-- DDL for Omni-SRE Supabase Integration

-- ENABLE UUID OSSP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name text,
    avatar_url text,
    github_username text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, github_username)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'user_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- WORKSPACES
CREATE TABLE public.workspaces (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- WORKSPACE MEMBERS
CREATE TABLE public.workspace_members (
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text CHECK (role IN ('admin', 'developer')) DEFAULT 'developer',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS for Workspaces
CREATE POLICY "Users can view workspaces they are members of" ON public.workspaces
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
);
CREATE POLICY "Users can create workspaces" ON public.workspaces
FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update workspaces if they are admins" ON public.workspaces
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = 'admin'
    )
);

-- Trigger to auto-add creator as admin to workspace_members
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new.id, new.created_by, 'admin');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_workspace();

-- RLS for Workspace Members
CREATE POLICY "Users can view members of their workspaces" ON public.workspace_members
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members AS wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert members if admin" ON public.workspace_members
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workspace_members AS wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'admin'
    )
);

-- INCIDENTS
CREATE TABLE public.incidents (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    new_rule text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view incidents in their workspaces" ON public.incidents
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = incidents.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert incidents in their workspaces" ON public.incidents
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = incidents.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
);

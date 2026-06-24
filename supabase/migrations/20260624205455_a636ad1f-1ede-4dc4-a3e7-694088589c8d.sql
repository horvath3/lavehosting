
-- =============== Enums ===============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.server_runtime AS ENUM ('nodejs', 'python');
CREATE TYPE public.server_status AS ENUM ('stopped', 'starting', 'running', 'stopping', 'crashed', 'creating', 'deleting');
CREATE TYPE public.command_kind AS ENUM ('start', 'stop', 'restart', 'delete', 'exec', 'sync_files');
CREATE TYPE public.command_status AS ENUM ('pending', 'running', 'done', 'failed');
CREATE TYPE public.log_level AS ENUM ('stdout', 'stderr', 'system');

-- =============== Profiles ===============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============== User roles ===============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============== Servers ===============
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  runtime public.server_runtime NOT NULL,
  status public.server_status NOT NULL DEFAULT 'creating',
  container_id TEXT,
  cpu_limit_pct INTEGER NOT NULL DEFAULT 50,
  ram_limit_mb INTEGER NOT NULL DEFAULT 512,
  disk_limit_mb INTEGER NOT NULL DEFAULT 1024,
  entry_file TEXT,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servers TO authenticated;
GRANT ALL ON public.servers TO service_role;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "servers_select_own_or_admin" ON public.servers FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "servers_insert_own" ON public.servers FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "servers_update_own_or_admin" ON public.servers FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "servers_delete_own_or_admin" ON public.servers FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =============== Metrics ===============
CREATE TABLE public.server_metrics (
  id BIGSERIAL PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  cpu_pct REAL NOT NULL DEFAULT 0,
  ram_mb REAL NOT NULL DEFAULT 0,
  disk_mb REAL NOT NULL DEFAULT 0,
  uptime_s INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX server_metrics_server_idx ON public.server_metrics(server_id, recorded_at DESC);
GRANT SELECT ON public.server_metrics TO authenticated;
GRANT ALL ON public.server_metrics TO service_role;
ALTER TABLE public.server_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metrics_select_via_server" ON public.server_metrics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- =============== Files (metadata) ===============
CREATE TABLE public.server_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  is_dir BOOLEAN NOT NULL DEFAULT false,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime TEXT,
  storage_key TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (server_id, path)
);
CREATE INDEX server_files_server_idx ON public.server_files(server_id, path);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_files TO authenticated;
GRANT ALL ON public.server_files TO service_role;
ALTER TABLE public.server_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "files_all_via_server" ON public.server_files FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- =============== Commands (runner queue) ===============
CREATE TABLE public.server_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  kind public.command_kind NOT NULL,
  payload JSONB,
  status public.command_status NOT NULL DEFAULT 'pending',
  result JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX server_commands_status_idx ON public.server_commands(status, created_at);
GRANT SELECT, INSERT ON public.server_commands TO authenticated;
GRANT ALL ON public.server_commands TO service_role;
ALTER TABLE public.server_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commands_select_via_server" ON public.server_commands FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "commands_insert_via_server" ON public.server_commands FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- =============== Logs ===============
CREATE TABLE public.server_logs (
  id BIGSERIAL PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  level public.log_level NOT NULL DEFAULT 'stdout',
  message TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX server_logs_server_idx ON public.server_logs(server_id, ts DESC);
GRANT SELECT ON public.server_logs TO authenticated;
GRANT ALL ON public.server_logs TO service_role;
ALTER TABLE public.server_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs_select_via_server" ON public.server_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- =============== Audit log ===============
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_only" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============== updated_at trigger ===============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER servers_set_updated_at BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER files_set_updated_at BEFORE UPDATE ON public.server_files
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============== Realtime ===============
ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_commands;


-- 1) Fix server-files storage policies (use storage.objects.name, not servers.name)
DROP POLICY IF EXISTS server_files_read ON storage.objects;
DROP POLICY IF EXISTS server_files_write ON storage.objects;
DROP POLICY IF EXISTS server_files_update ON storage.objects;
DROP POLICY IF EXISTS server_files_delete ON storage.objects;

-- 2) Add missing DELETE policy for avatars bucket
DROP POLICY IF EXISTS avatar_delete_own ON storage.objects;
CREATE POLICY avatar_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = (auth.uid())::text);

-- 3) Move has_role out of the exposed API schema (private schema not reachable via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Drop all policies that reference public.has_role, then drop the function
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate dropped public policies using private.has_role
CREATE POLICY profiles_select_own_or_admin ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY profiles_update_own_or_admin ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY user_roles_select_own_or_admin ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY servers_select_own_or_admin ON public.servers FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY servers_update_own_or_admin ON public.servers FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY servers_delete_own_or_admin ON public.servers FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY metrics_select_via_server ON public.server_metrics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))));

CREATE POLICY commands_select_via_server ON public.server_commands FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))));
CREATE POLICY commands_insert_via_server ON public.server_commands FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))));

CREATE POLICY files_all_via_server ON public.server_files FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))));

CREATE POLICY logs_select_via_server ON public.server_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))));

CREATE POLICY audit_admin_only ON public.audit_log FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- Recreate fixed server-files storage policies (use storage.objects.name, extract the leading server UUID segment)
CREATE POLICY server_files_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'server-files' AND EXISTS (
      SELECT 1 FROM public.servers s
      WHERE s.id::text = split_part(storage.objects.name, '/', 1)
        AND (s.owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY server_files_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'server-files' AND EXISTS (
      SELECT 1 FROM public.servers s
      WHERE s.id::text = split_part(storage.objects.name, '/', 1)
        AND (s.owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY server_files_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'server-files' AND EXISTS (
      SELECT 1 FROM public.servers s
      WHERE s.id::text = split_part(storage.objects.name, '/', 1)
        AND (s.owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY server_files_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'server-files' AND EXISTS (
      SELECT 1 FROM public.servers s
      WHERE s.id::text = split_part(storage.objects.name, '/', 1)
        AND (s.owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))
    )
  );

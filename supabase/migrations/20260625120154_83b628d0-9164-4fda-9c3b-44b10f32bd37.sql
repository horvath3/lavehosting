
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT NOT NULL DEFAULT 'hu'
    CHECK (preferred_locale IN ('hu', 'en'));

ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS provisioning_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provisioning_duration_s INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provisioned BOOLEAN NOT NULL DEFAULT true;

UPDATE public.servers SET provisioned = true WHERE provisioned IS NULL;

CREATE TABLE IF NOT EXISTS public.app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  provision_min_seconds INTEGER NOT NULL DEFAULT 180,
  provision_max_seconds INTEGER NOT NULL DEFAULT 240,
  provision_overload_seconds INTEGER NOT NULL DEFAULT 900,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_public_read" ON public.app_settings;
CREATE POLICY "app_settings_public_read" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "app_settings_admin_update" ON public.app_settings;
CREATE POLICY "app_settings_admin_update" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.app_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE (
  active_servers BIGINT,
  users BIGINT,
  running BIGINT,
  uptime TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.servers)::BIGINT,
    (SELECT COUNT(*) FROM public.profiles)::BIGINT,
    (SELECT COUNT(*) FROM public.servers WHERE status = 'running')::BIGINT,
    '99.97%'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;

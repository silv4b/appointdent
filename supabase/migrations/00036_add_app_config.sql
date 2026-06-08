CREATE TABLE IF NOT EXISTS public.app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin select app_config" ON public.app_config
  FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "admin insert app_config" ON public.app_config
  FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "admin update app_config" ON public.app_config
  FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "admin delete app_config" ON public.app_config
  FOR DELETE
  USING (public.get_user_role() = 'admin');

INSERT INTO public.app_config (key, value) VALUES
  ('gmail_user', ''),
  ('gmail_app_password', '')
ON CONFLICT (key) DO NOTHING;

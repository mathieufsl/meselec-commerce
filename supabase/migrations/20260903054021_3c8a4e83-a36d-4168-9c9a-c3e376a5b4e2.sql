CREATE TABLE public.veille_email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  nom text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX veille_email_recipients_email_key ON public.veille_email_recipients (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.veille_email_recipients TO authenticated;
GRANT ALL ON public.veille_email_recipients TO service_role;
ALTER TABLE public.veille_email_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commerce read veille recipients" ON public.veille_email_recipients FOR SELECT TO authenticated USING (public.commerce_has_access());
CREATE POLICY "commerce manage veille recipients" ON public.veille_email_recipients FOR ALL TO authenticated USING (public.commerce_has_access()) WITH CHECK (public.commerce_has_access());
CREATE TRIGGER trg_veille_email_recipients_updated_at BEFORE UPDATE ON public.veille_email_recipients FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

CREATE TABLE public.veille_digest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'ok',
  inserted_count integer NOT NULL DEFAULT 0,
  new_count integer NOT NULL DEFAULT 0,
  recipients_count integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.veille_digest_runs TO authenticated;
GRANT ALL ON public.veille_digest_runs TO service_role;
ALTER TABLE public.veille_digest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commerce read veille digest runs" ON public.veille_digest_runs FOR SELECT TO authenticated USING (public.commerce_has_access());
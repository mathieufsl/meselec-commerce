CREATE TABLE public.veille_annonces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL DEFAULT 'BOAMP',
  source_id text NOT NULL,
  intitule text NOT NULL DEFAULT '',
  acheteur text,
  cpv text,
  departement text,
  date_parution date,
  date_limite date,
  lien text,
  domaines text[] NOT NULL DEFAULT '{}',
  secteurs text[] NOT NULL DEFAULT '{}',
  statut text NOT NULL DEFAULT 'nouveau',
  ao_id uuid REFERENCES public.appels_offres(id) ON DELETE SET NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.veille_annonces TO authenticated;
GRANT ALL ON public.veille_annonces TO service_role;

ALTER TABLE public.veille_annonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "veille_annonces_read" ON public.veille_annonces
  FOR SELECT TO authenticated USING (public.commerce_has_access());

CREATE POLICY "veille_annonces_write" ON public.veille_annonces
  FOR ALL TO authenticated
  USING (public.commerce_has_access())
  WITH CHECK (public.commerce_has_access());

CREATE TRIGGER veille_annonces_updated_at BEFORE UPDATE ON public.veille_annonces
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

CREATE INDEX veille_annonces_statut_idx ON public.veille_annonces (statut, date_parution DESC);
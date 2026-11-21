-- Suivi en direct du robot DCE : étape en cours et lien vers l'exécution GitHub.
alter table public.veille_annonces
  add column if not exists analyse_etape text,
  add column if not exists analyse_etape_at timestamptz,
  add column if not exists analyse_run_url text;

-- Résumé IA de l'avis BOAMP (panneau détail de la Veille), mis en cache.
alter table public.veille_annonces
  add column if not exists avis_resume jsonb,
  add column if not exists avis_resume_at timestamptz;

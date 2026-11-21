-- Motif choisi quand une annonce de veille est ignorée (« Pas pour nous »).
alter table public.veille_annonces
  add column if not exists motif_ignore text,
  add column if not exists motif_ignore_note text;

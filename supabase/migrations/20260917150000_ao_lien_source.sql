-- Add a dedicated column to store the source announcement URL (e.g. BOAMP link)
-- so it can be rendered as a clickable link instead of being buried in notes.
alter table public.appels_offres
  add column if not exists lien_source text;

-- Backfill: extract BOAMP URLs already stored inside the notes field.
update public.appels_offres
set lien_source = substring(notes from 'https://www\.boamp\.fr/[^\s]+')
where lien_source is null
  and notes ~ 'https://www\.boamp\.fr/';

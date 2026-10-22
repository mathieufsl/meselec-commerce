-- Lien vers le dossier SharePoint de l'appel d'offres (bouton en en-tête de fiche).
alter table public.appels_offres
  add column if not exists sharepoint_url text;

-- Lien de l'annonce du marché (la référence de la liste AO pointe dessus).
alter table public.appels_offres
  add column if not exists annonce_url text;

-- Reprise des AO importés depuis la veille (« Annonce : https://… » dans les notes).
update public.appels_offres
set annonce_url = substring(notes from 'Annonce\s*:\s*(https?://[^\s]+)')
where annonce_url is null
  and notes ~* 'Annonce\s*:\s*https?://';

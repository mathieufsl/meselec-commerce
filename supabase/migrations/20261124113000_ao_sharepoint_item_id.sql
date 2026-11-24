-- Identifiant Microsoft Graph du dossier SharePoint de l'AO (stable même si le dossier est déplacé
-- de « 1_Non traité » vers « 3_En cours »…). Renseigné par l'Edge Function ao-sharepoint-dossier.
alter table public.appels_offres
  add column if not exists sharepoint_item_id text;

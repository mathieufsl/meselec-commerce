-- Qui gère la voirie ? (+ "aucun" pour la gestion EP : pas de bail)
alter table public.prospection_commune_suivi
  add column if not exists gestion_voirie text null;

alter table public.prospection_commune_suivi
  drop constraint if exists prospection_commune_suivi_gestion_check;
alter table public.prospection_commune_suivi
  add constraint prospection_commune_suivi_gestion_check
  check (gestion is null or gestion in ('commune', 'agglo', 'syndicat', 'aucun'));

alter table public.prospection_commune_suivi
  drop constraint if exists prospection_commune_suivi_gestion_voirie_check;
alter table public.prospection_commune_suivi
  add constraint prospection_commune_suivi_gestion_voirie_check
  check (gestion_voirie is null or gestion_voirie in ('commune', 'agglo', 'syndicat', 'aucun'));

-- Porte d'entrée (oui / non)
alter table public.prospection_commune_suivi
  add column if not exists porte_entree text null;
alter table public.prospection_commune_suivi
  drop constraint if exists prospection_commune_suivi_porte_entree_check;
alter table public.prospection_commune_suivi
  add constraint prospection_commune_suivi_porte_entree_check
  check (porte_entree is null or porte_entree in ('oui', 'non'));

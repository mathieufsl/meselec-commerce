-- Renomme le statut initial du pipeline AO : veille → non_traite

alter table public.appels_offres
  drop constraint if exists appels_offres_statut_check;

update public.appels_offres
set statut = 'non_traite'
where statut = 'veille';

alter table public.appels_offres
  alter column statut set default 'non_traite';

alter table public.appels_offres
  add constraint appels_offres_statut_check
  check (statut in ('non_traite', 'analyse', 'en_cours', 'depose', 'gagne', 'perdu', 'abandonne'));

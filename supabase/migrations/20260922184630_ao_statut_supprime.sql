-- Ajoute un statut "supprimé" pour les AO non intéressants (suppression douce, réversible en base).

alter table public.appels_offres
  drop constraint if exists appels_offres_statut_check;

alter table public.appels_offres
  add constraint appels_offres_statut_check
  check (statut in ('non_traite', 'analyse', 'en_cours', 'depose', 'gagne', 'perdu', 'abandonne', 'supprime'));

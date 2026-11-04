-- Ajoute le secteur Hydraulique aux AO

alter table public.ao_secteurs
  drop constraint if exists ao_secteurs_secteur_check;

alter table public.ao_secteurs
  add constraint ao_secteurs_secteur_check
  check (secteur in ('EP', 'CFO_CFA', 'Illumination', 'VRD', 'Enedis', 'Hydraulique'));

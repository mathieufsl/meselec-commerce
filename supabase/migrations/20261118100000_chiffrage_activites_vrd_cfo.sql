-- Chiffrage : nouvelles activités (VRD, CFO) et colonne matériel / location
-- pour les sous-détails de prix (déboursé sec : MO + matériel + fournitures + location).

alter table public.chiffrage_sources drop constraint if exists chiffrage_sources_activite_check;
alter table public.chiffrage_sources
  add constraint chiffrage_sources_activite_check
  check (activite in ('ep', 'illuminations', 'vrd', 'cfo'));

alter table public.chiffrage_parametres drop constraint if exists chiffrage_parametres_activite_check;
alter table public.chiffrage_parametres
  add constraint chiffrage_parametres_activite_check
  check (activite in ('ep', 'illuminations', 'vrd', 'cfo'));

-- Matériel, engins, location et prestations extérieures (hors sous-traitance).
alter table public.chiffrage_postes
  add column if not exists materiel_ht numeric(14,4) null;

-- Paramètres par défaut (modifiables). VRD : taux horaire du sous-détail Grigny lot 1.
insert into public.chiffrage_parametres (activite, cle, valeur, libelle, unite)
select a.activite, p.cle, case when p.cle = 'taux_horaire' then a.taux else p.valeur end, p.libelle, p.unite
from (values ('vrd', 43::numeric), ('cfo', 32::numeric)) as a(activite, taux)
cross join (values
  ('taux_horaire', 0::numeric, 'Taux horaire moyen (MO)', '€/h'),
  ('optimisation_fournitures', 0::numeric, 'Optimisation fournitures (+/-)', 'ratio'),
  ('petit_outillage', 0::numeric, 'Petit outillage / consommables (sur MO)', 'ratio'),
  ('coefficient', 1::numeric, 'Coefficient complémentaire', 'ratio'),
  ('aleas', 0.03::numeric, 'Aléas (% du prix de vente)', 'ratio'),
  ('frais_generaux', 0.10::numeric, 'Frais généraux (% du prix de vente)', 'ratio'),
  ('marge_nette', 0.05::numeric, 'Marge nette (% du prix de vente)', 'ratio')
) as p(cle, valeur, libelle, unite)
on conflict (activite, cle) do nothing;

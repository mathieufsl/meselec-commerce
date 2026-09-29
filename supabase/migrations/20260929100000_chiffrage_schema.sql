-- Module Chiffrage : historique des prix (réponses déposées + décomposition
-- fourniture / MO / marges) et paramètres du moteur de chiffrage.
-- Droits : module « appels_offres » (lecture / édition).

create table if not exists public.chiffrage_sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  nom text not null,
  client text null,
  activite text not null default 'ep' check (activite in ('ep', 'illuminations')),
  annee int null,
  ao_id uuid null references public.appels_offres(id) on delete set null,
  fichier_reponse text null,
  fichier_decomposition text null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chiffrage_postes (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.chiffrage_sources(id) on delete cascade,
  numero text null,
  section text null,
  designation text not null,
  unite text null,
  quantite numeric(14,4) null,
  pu_ht numeric(14,4) null,
  montant_ht numeric(14,2) null,
  famille text null,
  dimensions jsonb not null default '{}'::jsonb,
  -- Décomposition (issue des brouillons de chiffrage, quand elle existe)
  fourniture_ht numeric(14,4) null,
  heures_mo numeric(14,4) null,
  mo_ht numeric(14,4) null,
  sous_traitance_ht numeric(14,4) null,
  fournisseur text null,
  sous_traitant text null,
  aleas_ht numeric(14,4) null,
  frais_generaux_ht numeric(14,4) null,
  marge_nette_ht numeric(14,4) null,
  decomposition_origine text null,
  detail text null,
  fichier text null,
  feuille text null,
  ligne int null,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chiffrage_postes_source_idx on public.chiffrage_postes (source_id, ordre);
create index if not exists chiffrage_postes_famille_idx on public.chiffrage_postes (famille);
create index if not exists chiffrage_postes_designation_idx
  on public.chiffrage_postes using gin (to_tsvector('french', designation));

create table if not exists public.chiffrage_parametres (
  id uuid primary key default gen_random_uuid(),
  activite text not null check (activite in ('ep', 'illuminations')),
  cle text not null,
  valeur numeric(14,6) not null,
  libelle text not null,
  unite text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activite, cle)
);

-- Convention de la feuille « BPU Lot 2 Goussainville » :
--   PU = (fourniture x (1 + optimisation) + heures x taux + outillage x MO) x coefficient
--   aleas / frais généraux / marge nette = % du prix de vente (marge brute = leur somme).
insert into public.chiffrage_parametres (activite, cle, valeur, libelle, unite)
select a.activite, p.cle, p.valeur, p.libelle, p.unite
from (values ('ep'), ('illuminations')) as a(activite)
cross join (values
  ('taux_horaire', 32::numeric, 'Taux horaire moyen (MO)', '€/h'),
  ('optimisation_fournitures', 0::numeric, 'Optimisation fournitures (+/-)', 'ratio'),
  ('petit_outillage', 0::numeric, 'Petit outillage / consommables (sur MO)', 'ratio'),
  ('coefficient', 1::numeric, 'Coefficient complémentaire', 'ratio'),
  ('aleas', 0.03::numeric, 'Aléas (% du prix de vente)', 'ratio'),
  ('frais_generaux', 0.10::numeric, 'Frais généraux (% du prix de vente)', 'ratio'),
  ('marge_nette', 0.05::numeric, 'Marge nette (% du prix de vente)', 'ratio')
) as p(cle, valeur, libelle, unite)
on conflict (activite, cle) do nothing;

do $$
declare
  _tbl text;
begin
  foreach _tbl in array array['chiffrage_sources', 'chiffrage_postes', 'chiffrage_parametres']
  loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%s', _tbl, _tbl);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%s for each row execute function public.set_row_updated_at()',
      _tbl, _tbl
    );
    perform public.commerce_apply_module_policies(_tbl, 'appels_offres');
  end loop;
end $$;

-- AO profil marché : donneur d'ordre libre, pluriannuel, secteurs multiples

alter table public.appels_offres
  add column if not exists donneur_ordre_libre text null,
  add column if not exists marche_pluriannuel boolean not null default false;

create table if not exists public.ao_secteurs (
  id uuid primary key default gen_random_uuid(),
  ao_id uuid not null references public.appels_offres(id) on delete cascade,
  secteur text not null
    check (secteur in ('EP', 'CFO_CFA', 'Illumination', 'VRD', 'Enedis')),
  nature_marche text not null
    check (nature_marche in ('bail', 'travaux_neuf', 'autre')),
  prestations text[] not null default '{}',
  bail_duree_mois int null,
  bail_date_debut date null,
  bail_date_fin date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ao_id, secteur)
);

create index if not exists ao_secteurs_ao_idx on public.ao_secteurs (ao_id);
create index if not exists ao_secteurs_secteur_idx on public.ao_secteurs (secteur);

drop trigger if exists trg_ao_secteurs_updated_at on public.ao_secteurs;
create trigger trg_ao_secteurs_updated_at
  before update on public.ao_secteurs
  for each row execute function public.set_row_updated_at();

alter table public.ao_secteurs enable row level security;

drop policy if exists commerce_select on public.ao_secteurs;
create policy commerce_select on public.ao_secteurs
  for select to authenticated using (public.commerce_has_access());

drop policy if exists commerce_write on public.ao_secteurs;
create policy commerce_write on public.ao_secteurs
  for all to authenticated
  using (public.commerce_has_access())
  with check (public.commerce_has_access());

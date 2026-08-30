-- Profil utilisateur commerce + prospection EP (comme meselec-suivi) + seed AO OneDrive

-- ---------------------------------------------------------------------------
-- Profils utilisateurs
-- ---------------------------------------------------------------------------

create table if not exists public.commerce_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prenom text null,
  nom text null,
  telephone text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commerce_profiles enable row level security;

drop policy if exists commerce_profiles_self on public.commerce_profiles;
create policy commerce_profiles_self on public.commerce_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.commerce_has_access());

-- ---------------------------------------------------------------------------
-- Prospection EP (port depuis ERP)
-- ---------------------------------------------------------------------------

create table if not exists public.prospection_commune_suivi (
  commune_key text primary key,
  status text not null default 'todo'
    check (status in ('todo', 'inprogress', 'done', 'callback', 'refused')),
  gestion text null check (gestion is null or gestion in ('commune', 'agglo', 'syndicat')),
  prestataire text not null default '',
  contact text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

create index if not exists prospection_commune_suivi_status_idx
  on public.prospection_commune_suivi (status);

create or replace function public.touch_prospection_commune_suivi_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_touch_prospection_commune_suivi_updated_at on public.prospection_commune_suivi;
create trigger trg_touch_prospection_commune_suivi_updated_at
before insert or update on public.prospection_commune_suivi
for each row execute function public.touch_prospection_commune_suivi_updated_at();

alter table public.prospection_commune_suivi enable row level security;

drop policy if exists commerce_select on public.prospection_commune_suivi;
drop policy if exists commerce_write on public.prospection_commune_suivi;
create policy commerce_select on public.prospection_commune_suivi
  for select to authenticated using (public.commerce_has_access());
create policy commerce_write on public.prospection_commune_suivi
  for all to authenticated
  using (public.commerce_has_access())
  with check (public.commerce_has_access());

-- ---------------------------------------------------------------------------
-- Seed appels d'offres (export OneDrive 30/08/2026)
-- ---------------------------------------------------------------------------

insert into public.appels_offres (
  reference, titre, lieu, statut, notes, societe_attribuee_id
)
select v.reference, v.titre, nullif(v.lieu, ''), v.statut, v.notes, s.id
from (
  values
    ('260702', 'Arc de triomphe', 'Paris', 'depose', 'Import OneDrive — dossier 260702_Arc de triomphe'),
    ('260713', 'Goussainville Lot 2', 'Goussainville', 'depose', 'Import OneDrive — 260713_12H_GOUSSAINVILLE'),
    ('26-641', 'Arc de Triomphe — maintenance EP', 'Paris', 'depose', 'Import OneDrive — intitulé marché CMN'),
    ('AO-JOUARS', 'Mairie de Jouars-Pontchartrain', 'Jouars-Pontchartrain', 'en_cours', 'Import OneDrive'),
    ('AO-OSNY', 'Mairie d''Osny', 'Osny', 'en_cours', 'Import OneDrive'),
    ('AO-EVRY', 'Mairie d''Évry-Courcouronnes', 'Évry-Courcouronnes', 'en_cours', 'Import OneDrive'),
    ('AO-CHAMP', 'Mairie de Champagne-sur-Oise', 'Champagne-sur-Oise', 'en_cours', 'Import OneDrive'),
    ('AO-ASN', 'Rue Flachat — Asnières-sur-Seine', 'Asnières-sur-Seine', 'en_cours', 'Import OneDrive')
) as v(reference, titre, lieu, statut, notes)
cross join public.societes_exploitation s
where s.code = 'MESELEC'
  and not exists (
    select 1 from public.appels_offres ao where ao.reference = v.reference
  );

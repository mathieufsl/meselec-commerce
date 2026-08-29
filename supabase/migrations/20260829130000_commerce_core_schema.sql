-- Core schema for Meselec Commerce (pôle commerce mutualisé).
-- Run in the dedicated commerce Supabase project.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Auth allowlist
-- ---------------------------------------------------------------------------

create table if not exists public.commerce_allowed_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.commerce_has_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.commerce_allowed_emails cae
      join auth.users u on lower(u.email) = lower(cae.email)
      where u.id = auth.uid()
    );
$$;

revoke all on function public.commerce_has_access() from public;
grant execute on function public.commerce_has_access() to authenticated;

-- ---------------------------------------------------------------------------
-- Multi-exploitant (Meselec par défaut)
-- ---------------------------------------------------------------------------

create table if not exists public.societes_exploitation (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  nom text not null,
  erp_bridge_url text null,
  erp_bridge_key_env text null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.societes_exploitation (id, code, nom, erp_bridge_url)
values (
  'b0000001-0000-4000-8000-000000000001',
  'MESELEC',
  'MESELEC',
  null
)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Clients (master commerce)
-- ---------------------------------------------------------------------------

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  nom_entreprise text not null,
  code_entreprise text null,
  agence text null,
  adresse text null,
  contact text null,
  fonction text null,
  secteur text null check (secteur in ('EP', 'Tertiaire', 'Enedis')),
  telephone text null,
  email text null,
  erp_client_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_nom_idx on public.clients (nom_entreprise);
create index if not exists clients_secteur_idx on public.clients (secteur);

-- ---------------------------------------------------------------------------
-- Appels d'offres
-- ---------------------------------------------------------------------------

create table if not exists public.appels_offres (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  titre text not null,
  donneur_ordre_id uuid null references public.clients(id) on delete set null,
  type_marche text null,
  lieu text null,
  date_publication date null,
  date_limite_depot date null,
  montant_estime numeric(14,2) null,
  statut text not null default 'veille'
    check (statut in ('veille', 'analyse', 'en_cours', 'depose', 'gagne', 'perdu', 'abandonne')),
  societe_attribuee_id uuid null references public.societes_exploitation(id) on delete set null,
  chantier_erp_id uuid null,
  handoff_at timestamptz null,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appels_offres_statut_idx on public.appels_offres (statut, date_limite_depot);
create index if not exists appels_offres_reference_idx on public.appels_offres (reference);

create table if not exists public.ao_lots (
  id uuid primary key default gen_random_uuid(),
  ao_id uuid not null references public.appels_offres(id) on delete cascade,
  numero_lot text not null,
  designation text not null default '',
  montant_estime numeric(14,2) null,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ao_id, numero_lot)
);

create index if not exists ao_lots_ao_idx on public.ao_lots (ao_id, ordre);

create table if not exists public.ao_documents (
  id uuid primary key default gen_random_uuid(),
  ao_id uuid not null references public.appels_offres(id) on delete cascade,
  type text not null default 'autre'
    check (type in ('dce', 'rc', 'cctp', 'ae', 'dpgf', 'bpu', 'memoire', 'annexe', 'autre')),
  nom_fichier text not null,
  fichier_url text null,
  version int not null default 1,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ao_documents_ao_idx on public.ao_documents (ao_id, type);

-- ---------------------------------------------------------------------------
-- Catalogues BPU / DPGF
-- ---------------------------------------------------------------------------

create table if not exists public.bpu_catalogues (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  client_id uuid null references public.clients(id) on delete set null,
  type text not null default 'bpu' check (type in ('bpu', 'dpgf')),
  poste_code text null,
  actif boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bpu_lignes (
  id uuid primary key default gen_random_uuid(),
  catalogue_id uuid not null references public.bpu_catalogues(id) on delete cascade,
  poste_code text null,
  numero_prix text not null,
  designation text not null,
  unite text null,
  pu_ht numeric(14,4) null,
  niveau text not null default 'ligne'
    check (niveau in ('section', 'sous_section', 'ligne')),
  parent_numero text null,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalogue_id, numero_prix, designation)
);

create index if not exists bpu_lignes_catalogue_idx on public.bpu_lignes (catalogue_id, ordre);
create index if not exists bpu_lignes_designation_idx on public.bpu_lignes using gin (to_tsvector('french', designation));

-- ---------------------------------------------------------------------------
-- Réponses AO / chiffrage
-- ---------------------------------------------------------------------------

create table if not exists public.ao_reponses (
  id uuid primary key default gen_random_uuid(),
  ao_id uuid not null references public.appels_offres(id) on delete cascade,
  lot_id uuid null references public.ao_lots(id) on delete set null,
  catalogue_id uuid null references public.bpu_catalogues(id) on delete set null,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'finalise', 'depose')),
  montant_retenu numeric(14,2) null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ao_reponses_ao_idx on public.ao_reponses (ao_id);

create table if not exists public.ao_reponse_lignes (
  id uuid primary key default gen_random_uuid(),
  reponse_id uuid not null references public.ao_reponses(id) on delete cascade,
  bpu_ligne_id uuid null references public.bpu_lignes(id) on delete set null,
  numero_prix text not null default '',
  designation text not null default '',
  unite text null,
  quantite numeric(14,4) not null default 0,
  pu_ht numeric(14,4) not null default 0,
  montant numeric(14,2) not null default 0,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ao_reponse_lignes_reponse_idx on public.ao_reponse_lignes (reponse_id, ordre);

-- ---------------------------------------------------------------------------
-- Mémoires techniques
-- ---------------------------------------------------------------------------

create table if not exists public.memoires_techniques (
  id uuid primary key default gen_random_uuid(),
  ao_id uuid not null references public.appels_offres(id) on delete cascade,
  version int not null default 1,
  titre text not null default 'Mémoire technique',
  contenu_json jsonb not null default '{}'::jsonb,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'valide')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ao_id, version)
);

-- ---------------------------------------------------------------------------
-- Fournisseurs commerciaux
-- ---------------------------------------------------------------------------

create table if not exists public.fournisseurs_commerciaux (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  specialites text[] not null default '{}',
  siret text null,
  contacts_json jsonb not null default '[]'::jsonb,
  notes text null,
  actif boolean not null default true,
  erp_fournisseur_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fournisseurs_commerciaux_nom_idx on public.fournisseurs_commerciaux (lower(nom));

-- ---------------------------------------------------------------------------
-- Prospection (migration depuis ERP)
-- ---------------------------------------------------------------------------

create table if not exists public.prospection_suivi (
  id uuid primary key default gen_random_uuid(),
  commune_key text not null unique,
  departement text null,
  qui_cible text not null default '',
  statut text not null default 'a_contacter'
    check (statut in ('a_contacter', 'en_cours', 'relance', 'gagne', 'perdu', 'inactif')),
  prochaine_action date null,
  notes text not null default '',
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospection_suivi_statut_idx on public.prospection_suivi (statut, prochaine_action);

-- ---------------------------------------------------------------------------
-- Cache ERP (sync lecture)
-- ---------------------------------------------------------------------------

create table if not exists public.erp_cache_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null check (status in ('ok', 'error')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.erp_cache_employes (
  id int primary key default 1,
  rows jsonb not null default '[]'::jsonb,
  refreshed_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint erp_cache_employes_single_row check (id = 1)
);

insert into public.erp_cache_employes (id) values (1) on conflict (id) do nothing;

create table if not exists public.erp_cache_clients (
  id int primary key default 1,
  rows jsonb not null default '[]'::jsonb,
  refreshed_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint erp_cache_clients_single_row check (id = 1)
);

insert into public.erp_cache_clients (id) values (1) on conflict (id) do nothing;

create table if not exists public.erp_cache_fournisseurs (
  id int primary key default 1,
  rows jsonb not null default '[]'::jsonb,
  refreshed_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint erp_cache_fournisseurs_single_row check (id = 1)
);

insert into public.erp_cache_fournisseurs (id) values (1) on conflict (id) do nothing;

create table if not exists public.commerce_settings (
  id int primary key default 1,
  last_erp_sync_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint commerce_settings_single_row check (id = 1)
);

insert into public.commerce_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.import_bpu_lignes(p_catalogue_id uuid, p_lignes jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ligne jsonb;
  v_count integer := 0;
begin
  if not public.commerce_has_access() then
    raise exception 'Accès refusé';
  end if;

  delete from public.bpu_lignes where catalogue_id = p_catalogue_id;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    insert into public.bpu_lignes (
      catalogue_id, poste_code, numero_prix, designation, unite, pu_ht,
      niveau, parent_numero, ordre
    ) values (
      p_catalogue_id,
      nullif(v_ligne->>'poste_code', ''),
      v_ligne->>'numero_prix',
      v_ligne->>'designation',
      nullif(v_ligne->>'unite', ''),
      nullif(v_ligne->>'pu_ht', '')::numeric,
      coalesce(v_ligne->>'niveau', 'ligne'),
      nullif(v_ligne->>'parent_numero', ''),
      coalesce(nullif(v_ligne->>'ordre', '')::integer, 0)
    )
    on conflict (catalogue_id, numero_prix, designation) do update set
      poste_code = excluded.poste_code,
      unite = excluded.unite,
      pu_ht = excluded.pu_ht,
      niveau = excluded.niveau,
      parent_numero = excluded.parent_numero,
      ordre = excluded.ordre;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.import_bpu_lignes(uuid, jsonb) to authenticated;

create or replace function public.recalc_ao_reponse_montant(p_reponse_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
begin
  select coalesce(sum(montant), 0) into v_total
  from public.ao_reponse_lignes
  where reponse_id = p_reponse_id;

  update public.ao_reponses
  set montant_retenu = v_total, updated_at = now()
  where id = p_reponse_id;

  return v_total;
end;
$$;

grant execute on function public.recalc_ao_reponse_montant(uuid) to authenticated;

-- Triggers updated_at
do $$
declare _tbl text;
begin
  foreach _tbl in array array[
    'societes_exploitation', 'clients', 'appels_offres', 'ao_lots', 'ao_documents',
    'bpu_catalogues', 'bpu_lignes', 'ao_reponses', 'ao_reponse_lignes',
    'memoires_techniques', 'fournisseurs_commerciaux', 'prospection_suivi', 'commerce_settings'
  ]
  loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%s', _tbl, _tbl);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%s for each row execute function public.set_row_updated_at()',
      _tbl, _tbl
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

do $$
declare _tbl text;
begin
  foreach _tbl in array array[
    'commerce_allowed_emails',
    'societes_exploitation', 'clients', 'appels_offres', 'ao_lots', 'ao_documents',
    'bpu_catalogues', 'bpu_lignes', 'ao_reponses', 'ao_reponse_lignes',
    'memoires_techniques', 'fournisseurs_commerciaux', 'prospection_suivi',
    'erp_cache_sync_runs', 'erp_cache_employes', 'erp_cache_clients', 'erp_cache_fournisseurs',
    'commerce_settings'
  ]
  loop
    execute format('alter table public.%s enable row level security', _tbl);
    execute format('drop policy if exists commerce_select on public.%s', _tbl);
    execute format('create policy commerce_select on public.%s for select to authenticated using (public.commerce_has_access())', _tbl);
    if _tbl <> 'commerce_allowed_emails' and _tbl not like 'erp_cache_%' then
      execute format('drop policy if exists commerce_write on public.%s', _tbl);
      execute format('create policy commerce_write on public.%s for all to authenticated using (public.commerce_has_access()) with check (public.commerce_has_access())', _tbl);
    end if;
    if _tbl like 'erp_cache_%' or _tbl = 'commerce_settings' then
      execute format('drop policy if exists commerce_write on public.%s', _tbl);
      execute format('create policy commerce_write on public.%s for all to authenticated using (public.commerce_has_access()) with check (public.commerce_has_access())', _tbl);
    end if;
  end loop;
end $$;

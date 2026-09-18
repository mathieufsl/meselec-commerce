-- Croissance externe (CE) — dossiers de suivi M&A / cibles

create table if not exists public.ce_dossiers (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  titre text not null,
  nom_cible text not null,
  situation_juridique text not null default 'in_bonis'
    check (situation_juridique in ('in_bonis', 'sauvegarde', 'redressement', 'liquidation')),
  statut text not null default 'detection'
    check (statut in (
      'detection',
      'analyse',
      'offre',
      'negociation',
      'closing',
      'acquis',
      'abandonne'
    )),
  lieu text null,
  activite text null,
  ca_estime numeric(14, 2) null,
  ebitda_estime numeric(14, 2) null,
  valorisation_estimee numeric(14, 2) null,
  effectif int null,
  interlocuteur text null,
  societe_acheteuse_id uuid null references public.societes_exploitation(id) on delete set null,
  date_detection date null,
  date_closing_cible date null,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ce_dossiers_statut_idx
  on public.ce_dossiers (statut, date_closing_cible);

create index if not exists ce_dossiers_situation_idx
  on public.ce_dossiers (situation_juridique);

create index if not exists ce_dossiers_reference_idx
  on public.ce_dossiers (reference);

drop trigger if exists trg_ce_dossiers_updated_at on public.ce_dossiers;
create trigger trg_ce_dossiers_updated_at
  before update on public.ce_dossiers
  for each row execute function public.set_row_updated_at();

alter table public.ce_dossiers enable row level security;

drop policy if exists commerce_select on public.ce_dossiers;
create policy commerce_select on public.ce_dossiers
  for select to authenticated using (public.commerce_has_access());

drop policy if exists commerce_write on public.ce_dossiers;
create policy commerce_write on public.ce_dossiers
  for all to authenticated
  using (public.commerce_has_access())
  with check (public.commerce_has_access());

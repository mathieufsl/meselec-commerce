-- Qualification IA des annonces de veille (Claude) + profils de qualification par entité.

alter table public.veille_annonces
  add column if not exists qualif_statut text not null default 'a_qualifier',
  add column if not exists entite text,
  add column if not exists decision text,
  add column if not exists score int,
  add column if not exists resume text,
  add column if not exists raisons text[] not null default '{}',
  add column if not exists points_rouges text[] not null default '{}',
  add column if not exists exigences jsonb not null default '{}'::jsonb,
  add column if not exists certif_manquante boolean not null default false,
  add column if not exists interet_relationnel boolean not null default false,
  add column if not exists type_marche text,
  add column if not exists plateforme text,
  add column if not exists dce_url text,
  add column if not exists qualif_model text,
  add column if not exists qualif_error text,
  add column if not exists qualif_usage jsonb,
  add column if not exists qualified_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'veille_annonces_qualif_statut_check') then
    alter table public.veille_annonces add constraint veille_annonces_qualif_statut_check
      check (qualif_statut in ('a_qualifier', 'qualifie', 'erreur'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'veille_annonces_decision_check') then
    alter table public.veille_annonces add constraint veille_annonces_decision_check
      check (decision is null or decision in ('hors_sujet', 'a_creuser', 'prioritaire'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'veille_annonces_entite_check') then
    alter table public.veille_annonces add constraint veille_annonces_entite_check
      check (entite is null or entite in ('MESELEC', 'MESTP', 'aucune'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'veille_annonces_score_check') then
    alter table public.veille_annonces add constraint veille_annonces_score_check
      check (score is null or score between 0 and 100);
  end if;
end $$;

create index if not exists veille_annonces_qualif_statut_idx
  on public.veille_annonces (qualif_statut);
create index if not exists veille_annonces_decision_score_idx
  on public.veille_annonces (decision, score desc);

-- Profils de qualification (une ligne par entité).
create table if not exists public.qualification_profil (
  id uuid primary key default gen_random_uuid(),
  entite text not null unique,
  actif boolean not null default true,
  metiers text[] not null default '{}',
  hors_perimetre text[] not null default '{}',
  departements text[] not null default '{}',
  certifications_detenues text[] not null default '{}',
  certifications_manquantes text[] not null default '{}',
  montant_min numeric,
  montant_max numeric,
  regles text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.qualification_profil enable row level security;

drop policy if exists "qualification_profil_read" on public.qualification_profil;
drop policy if exists "qualification_profil_write" on public.qualification_profil;
create policy "qualification_profil_read" on public.qualification_profil
  for select to authenticated
  using (public.commerce_can_read_module(auth.uid(), 'appels_offres'));
create policy "qualification_profil_write" on public.qualification_profil
  for all to authenticated
  using (public.commerce_can_edit_module(auth.uid(), 'appels_offres'))
  with check (public.commerce_can_edit_module(auth.uid(), 'appels_offres'));

grant select, insert, update, delete on public.qualification_profil to authenticated;
grant all on public.qualification_profil to service_role;

-- Seed (n'écrase pas un profil déjà édité).
insert into public.qualification_profil
  (entite, metiers, hors_perimetre, departements, certifications_detenues, certifications_manquantes, regles)
values
  (
    'MESELEC',
    array[
      'éclairage public (travaux neufs, rénovation LED, maintenance)',
      'illuminations de fêtes (pose et fourniture)',
      'signalisation lumineuse tricolore (maintenance et travaux)',
      'IRVE (bornes de recharge)',
      'raccordements et réseaux Enedis BT/HTA',
      'électricité tertiaire CFO/CFA',
      'fourniture de luminaires et de matériel d''éclairage'
    ],
    array[
      'prestations intellectuelles (maîtrise d''œuvre, études, AMO, diagnostics)',
      'informatique',
      'nettoyage',
      'assurance',
      'véhicules'
    ],
    array['75','77','78','91','92','93','94','95','60','27'],
    array[]::text[],
    array['MASE', 'QUALIFELEC colonnes électriques (mention CLN)'],
    $r$Une certification exigée que nous n'avons pas n'élimine PAS l'AO : décision a_creuser, certif_manquante=true, score plafonné à 60. Si l'acheteur est une collectivité ou un acteur public local, mettre interet_relationnel=true : la visite sert à rencontrer les élus et services techniques.
Les fournitures seules (luminaires, motifs d'illumination, matériel électrique) sont dans le périmètre de MESELEC.
Une concession, une délégation de service public ou un affermage d'exploitation est hors_sujet, sauf si l'objet principal est l'éclairage public ou les illuminations.
Hors de la zone : hors_sujet, sauf montant élevé et métier cœur (le signaler dans les raisons).$r$
  ),
  (
    'MESTP',
    array[
      'terrassement',
      'VRD',
      'voirie',
      'tranchées et génie civil réseaux',
      'réseaux secs',
      'hydraulique (AEP, assainissement, réseaux d''eau)',
      'aménagements urbains'
    ],
    array[
      'prestations intellectuelles',
      'études',
      'exploitation de stations',
      'fournitures de réactifs/produits',
      'location de matériel sans travaux'
    ],
    array['75','77','78','91','92','93','94','95','60','27'],
    array[]::text[],
    array[]::text[],
    $r$Une certification exigée que nous n'avons pas n'élimine PAS l'AO : décision a_creuser, certif_manquante=true, score plafonné à 60. Si l'acheteur est une collectivité ou un acteur public local, mettre interet_relationnel=true : la visite sert à rencontrer les élus et services techniques.
Les fournitures seules (luminaires, motifs d'illumination, matériel électrique) sont dans le périmètre de MESELEC.
Une concession, une délégation de service public ou un affermage d'exploitation est hors_sujet, sauf si l'objet principal est l'éclairage public ou les illuminations.
Hors de la zone : hors_sujet, sauf montant élevé et métier cœur (le signaler dans les raisons).$r$
  )
on conflict (entite) do nothing;

-- Veille AO : lecture de l'avis complet, récupération du DCE et analyse RC/CCTP
-- (visite, certifications) par le robot GitHub Actions `veille-dce`.

alter table public.veille_annonces
  add column if not exists url_dce text null,
  add column if not exists plateforme text null,
  add column if not exists avis_indices jsonb not null default '{}'::jsonb,
  add column if not exists analyse_statut text not null default 'a_faire',
  add column if not exists analyse_dce jsonb null,
  add column if not exists analyse_erreur text null,
  add column if not exists analyse_at timestamptz null,
  add column if not exists analyse_tentatives integer not null default 0,
  add column if not exists dce_fichiers jsonb not null default '[]'::jsonb;

alter table public.veille_annonces drop constraint if exists veille_annonces_analyse_statut_check;
alter table public.veille_annonces add constraint veille_annonces_analyse_statut_check
  check (analyse_statut in ('a_faire', 'termine', 'sans_dce', 'echec', 'non_demande'));

-- Les annonces déjà connues ne sont analysées que si elles sont encore ouvertes.
update public.veille_annonces
  set analyse_statut = 'non_demande'
  where analyse_statut = 'a_faire'
    and analyse_at is null
    and (statut <> 'nouveau' or (date_limite is not null and date_limite < current_date));

create index if not exists veille_annonces_analyse_idx
  on public.veille_annonces (analyse_statut, date_parution desc);

-- Pièces récupérées (RC, CCTP…) : lecture réservée au module appels d'offres,
-- écriture par le robot (service_role).
insert into storage.buckets (id, name, public, file_size_limit)
values ('veille-dce', 'veille-dce', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "commerce select veille dce storage" on storage.objects;
create policy "commerce select veille dce storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'veille-dce'
    and public.commerce_can_read_module(auth.uid(), 'appels_offres')
  );

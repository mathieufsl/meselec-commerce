-- AO comments (discussion on appel d'offres fiche)

create table if not exists public.ao_comments (
  id uuid primary key default gen_random_uuid(),
  ao_id uuid not null references public.appels_offres(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ao_comments_ao_idx on public.ao_comments (ao_id, created_at desc);

drop trigger if exists trg_ao_comments_updated_at on public.ao_comments;
create trigger trg_ao_comments_updated_at
  before update on public.ao_comments
  for each row execute function public.set_row_updated_at();

alter table public.ao_comments enable row level security;

drop policy if exists commerce_select on public.ao_comments;
create policy commerce_select on public.ao_comments
  for select to authenticated using (public.commerce_has_access());

drop policy if exists commerce_write on public.ao_comments;
create policy commerce_write on public.ao_comments
  for all to authenticated
  using (public.commerce_has_access())
  with check (public.commerce_has_access());

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_ao_comments(
  p_ao_id uuid,
  p_limit int default 50
)
returns table (
  id uuid,
  ao_id uuid,
  author_user_id uuid,
  author_prenom text,
  author_nom text,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    c.id,
    c.ao_id,
    c.author_user_id,
    coalesce(cp.prenom, '') as author_prenom,
    coalesce(cp.nom, '') as author_nom,
    c.body,
    c.created_at
  from public.ao_comments c
  left join public.commerce_profiles cp on cp.user_id = c.author_user_id
  where c.ao_id = p_ao_id
    and c.deleted_at is null
    and public.commerce_has_access()
  order by c.created_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

create or replace function public.post_ao_comment(
  p_ao_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_body text;
  v_comment_id uuid;
begin
  if not public.commerce_has_access() then
    raise exception 'Accès refusé';
  end if;

  if not exists (select 1 from public.appels_offres where id = p_ao_id) then
    raise exception 'Appel d''offres introuvable';
  end if;

  v_body := nullif(trim(coalesce(p_body, '')), '');
  if v_body is null then
    raise exception 'Commentaire vide';
  end if;

  insert into public.ao_comments (ao_id, author_user_id, body)
  values (p_ao_id, auth.uid(), v_body)
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

grant execute on function public.get_ao_comments(uuid, int) to authenticated;
grant execute on function public.post_ao_comment(uuid, text) to authenticated;

-- RLS modules commerce (inspiré meselec-suivi) :
-- allowlist = connexion ; commerce_user_module_access = lecture / écriture par module.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.commerce_account_manager_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.commerce_account_manager_emails (email)
values ('mathieu.faessel@meselec.fr')
on conflict (email) do nothing;

create table if not exists public.commerce_user_module_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  role text not null default 'editor',
  created_at timestamptz not null default now(),
  unique (user_id, module),
  constraint commerce_user_module_access_module_check check (module in (
    'dashboard',
    'appels_offres',
    'ce',
    'catalogues',
    'fournisseurs',
    'prospection',
    'admin',
    '_aucun'
  )),
  constraint commerce_user_module_access_role_check check (role in ('viewer', 'editor'))
);

create index if not exists commerce_user_module_access_user_idx
  on public.commerce_user_module_access (user_id);

alter table public.commerce_account_manager_emails enable row level security;
alter table public.commerce_user_module_access enable row level security;

drop policy if exists commerce_select on public.commerce_account_manager_emails;
drop policy if exists commerce_select on public.commerce_user_module_access;

create policy commerce_select on public.commerce_user_module_access
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Helpers modules
-- ---------------------------------------------------------------------------

create or replace function public.commerce_has_module_restriction(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.commerce_user_module_access uma
    where uma.user_id = _user_id
  );
$$;

create or replace function public.commerce_has_module_access(_user_id uuid, _module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.commerce_user_module_access uma
    where uma.user_id = _user_id
      and uma.module = _module
      and uma.module <> '_aucun'
  );
$$;

create or replace function public.commerce_is_account_manager(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.commerce_account_manager_emails cam
    join auth.users u on lower(u.email) = lower(cam.email)
    where u.id = _user_id
  );
$$;

create or replace function public.commerce_can_manage_accounts(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.commerce_has_access()
    and (
      public.commerce_is_account_manager(_user_id)
      or (
        public.commerce_has_module_restriction(_user_id)
        and exists (
          select 1 from public.commerce_user_module_access uma
          where uma.user_id = _user_id
            and uma.module = 'admin'
            and uma.role = 'editor'
        )
      )
      -- Legacy : aucun module paramétré = accès total (gestionnaires historiques)
      or not public.commerce_has_module_restriction(_user_id)
    );
$$;

create or replace function public.commerce_can_read_module(_user_id uuid, _module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.commerce_has_access()
    and (
      public.commerce_is_account_manager(_user_id)
      or not public.commerce_has_module_restriction(_user_id)
      or public.commerce_has_module_access(_user_id, _module)
    );
$$;

create or replace function public.commerce_can_edit_module(_user_id uuid, _module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.commerce_has_access()
    and (
      public.commerce_is_account_manager(_user_id)
      or not public.commerce_has_module_restriction(_user_id)
      or exists (
        select 1 from public.commerce_user_module_access uma
        where uma.user_id = _user_id
          and uma.module = _module
          and uma.module <> '_aucun'
          and uma.role = 'editor'
      )
    );
$$;

create or replace function public.commerce_get_my_modules()
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_all text[] := array[
    'dashboard', 'appels_offres', 'ce', 'catalogues', 'fournisseurs', 'prospection', 'admin'
  ];
  v_modules text[];
begin
  if not public.commerce_has_access() then
    return array[]::text[];
  end if;

  if public.commerce_is_account_manager(auth.uid())
     or not public.commerce_has_module_restriction(auth.uid()) then
    return v_all;
  end if;

  select array_agg(module order by module) into v_modules
  from public.commerce_user_module_access
  where user_id = auth.uid() and module <> '_aucun';

  return coalesce(v_modules, array[]::text[]);
end;
$$;

create or replace function public.commerce_get_my_editor_modules()
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_all text[] := array[
    'dashboard', 'appels_offres', 'ce', 'catalogues', 'fournisseurs', 'prospection', 'admin'
  ];
  v_modules text[];
begin
  if not public.commerce_has_access() then
    return array[]::text[];
  end if;

  if public.commerce_is_account_manager(auth.uid())
     or not public.commerce_has_module_restriction(auth.uid()) then
    return v_all;
  end if;

  select array_agg(module order by module) into v_modules
  from public.commerce_user_module_access
  where user_id = auth.uid()
    and module <> '_aucun'
    and role = 'editor';

  return coalesce(v_modules, array[]::text[]);
end;
$$;

create or replace function public.commerce_get_my_session()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.commerce_has_access() then
    return jsonb_build_object(
      'has_access', false,
      'modules', '[]'::jsonb,
      'editor_modules', '[]'::jsonb,
      'can_manage_accounts', false
    );
  end if;

  return jsonb_build_object(
    'has_access', true,
    'modules', to_jsonb(public.commerce_get_my_modules()),
    'editor_modules', to_jsonb(public.commerce_get_my_editor_modules()),
    'can_manage_accounts', public.commerce_can_manage_accounts(auth.uid())
  );
end;
$$;

create or replace function public.commerce_set_user_module_roles(
  p_user_id uuid,
  p_module_roles jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_module text;
  v_role text;
  v_all_modules text[] := array[
    'dashboard', 'appels_offres', 'ce', 'catalogues', 'fournisseurs', 'prospection', 'admin'
  ];
  v_has_any boolean := false;
begin
  if not public.commerce_can_manage_accounts(auth.uid()) then
    raise exception 'Accès réservé aux gestionnaires de comptes';
  end if;

  if p_user_id is null then
    raise exception 'user_id requis';
  end if;

  delete from public.commerce_user_module_access where user_id = p_user_id;

  if p_module_roles is null or p_module_roles = '{}'::jsonb then
    insert into public.commerce_user_module_access (user_id, module, role)
    values (p_user_id, '_aucun', 'editor');
    return;
  end if;

  for v_module in select unnest(v_all_modules)
  loop
    v_role := p_module_roles ->> v_module;
    if v_role is not null and v_role <> '' and v_role <> 'rien' then
      v_has_any := true;
      if v_role not in ('viewer', 'editor') then
        v_role := 'editor';
      end if;
      insert into public.commerce_user_module_access (user_id, module, role)
      values (p_user_id, v_module, v_role)
      on conflict (user_id, module) do update set role = excluded.role;
    end if;
  end loop;

  if not v_has_any then
    insert into public.commerce_user_module_access (user_id, module, role)
    values (p_user_id, '_aucun', 'editor');
  end if;
end;
$$;

drop function if exists public.commerce_list_accounts();

create or replace function public.commerce_list_accounts()
returns table (
  email text,
  user_id uuid,
  prenom text,
  nom text,
  telephone text,
  allowed_at timestamptz,
  last_sign_in_at timestamptz,
  has_auth_user boolean,
  module_roles jsonb
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_all_modules text[] := array[
    'dashboard', 'appels_offres', 'ce', 'catalogues', 'fournisseurs', 'prospection', 'admin'
  ];
begin
  if not public.commerce_can_manage_accounts(auth.uid()) then
    raise exception 'Accès réservé aux gestionnaires de comptes';
  end if;

  return query
  select
    cae.email,
    u.id as user_id,
    p.prenom,
    p.nom,
    p.telephone,
    cae.created_at as allowed_at,
    u.last_sign_in_at,
    (u.id is not null) as has_auth_user,
    case
      when u.id is null then '{}'::jsonb
      when not exists (
        select 1 from public.commerce_user_module_access uma where uma.user_id = u.id
      ) then (
        select jsonb_object_agg(m, 'editor') from unnest(v_all_modules) as m
      )
      when exists (
        select 1 from public.commerce_user_module_access uma
        where uma.user_id = u.id and uma.module = '_aucun'
      ) then '{}'::jsonb
      else (
        select coalesce(jsonb_object_agg(uma.module, uma.role), '{}'::jsonb)
        from public.commerce_user_module_access uma
        where uma.user_id = u.id and uma.module <> '_aucun'
      )
    end as module_roles
  from public.commerce_allowed_emails cae
  left join auth.users u on lower(u.email) = lower(cae.email)
  left join public.commerce_profiles p on p.user_id = u.id
  order by cae.email;
end;
$$;

revoke all on function public.commerce_has_module_restriction(uuid) from public;
revoke all on function public.commerce_has_module_access(uuid, text) from public;
revoke all on function public.commerce_is_account_manager(uuid) from public;
revoke all on function public.commerce_can_manage_accounts(uuid) from public;
revoke all on function public.commerce_can_read_module(uuid, text) from public;
revoke all on function public.commerce_can_edit_module(uuid, text) from public;
revoke all on function public.commerce_get_my_modules() from public;
revoke all on function public.commerce_get_my_editor_modules() from public;
revoke all on function public.commerce_get_my_session() from public;
revoke all on function public.commerce_set_user_module_roles(uuid, jsonb) from public;
revoke all on function public.commerce_list_accounts() from public;

grant execute on function public.commerce_has_module_restriction(uuid) to authenticated;
grant execute on function public.commerce_has_module_access(uuid, text) to authenticated;
grant execute on function public.commerce_is_account_manager(uuid) to authenticated;
grant execute on function public.commerce_can_manage_accounts(uuid) to authenticated;
grant execute on function public.commerce_can_read_module(uuid, text) to authenticated;
grant execute on function public.commerce_can_edit_module(uuid, text) to authenticated;
grant execute on function public.commerce_get_my_modules() to authenticated;
grant execute on function public.commerce_get_my_editor_modules() to authenticated;
grant execute on function public.commerce_get_my_session() to authenticated;
grant execute on function public.commerce_set_user_module_roles(uuid, jsonb) to authenticated;
grant execute on function public.commerce_list_accounts() to authenticated;

-- Managers peuvent lire la table allowlist managers (eux-mêmes)
drop policy if exists commerce_managers_select on public.commerce_account_manager_emails;
create policy commerce_managers_select on public.commerce_account_manager_emails
  for select to authenticated
  using (public.commerce_can_manage_accounts(auth.uid()));

-- ---------------------------------------------------------------------------
-- Policies par module
-- ---------------------------------------------------------------------------

create or replace function public.commerce_apply_module_policies(
  p_table text,
  p_module text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format('alter table public.%I enable row level security', p_table);
  execute format('drop policy if exists commerce_select on public.%I', p_table);
  execute format('drop policy if exists commerce_write on public.%I', p_table);
  execute format(
    'create policy commerce_select on public.%I for select to authenticated using (public.commerce_can_read_module(auth.uid(), %L))',
    p_table, p_module
  );
  execute format(
    'create policy commerce_write on public.%I for all to authenticated using (public.commerce_can_edit_module(auth.uid(), %L)) with check (public.commerce_can_edit_module(auth.uid(), %L))',
    p_table, p_module, p_module
  );
end;
$$;

do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('appels_offres', 'appels_offres'),
      ('ao_lots', 'appels_offres'),
      ('ao_documents', 'appels_offres'),
      ('ao_reponses', 'appels_offres'),
      ('ao_reponse_lignes', 'appels_offres'),
      ('ao_comments', 'appels_offres'),
      ('ao_secteurs', 'appels_offres'),
      ('memoires_techniques', 'appels_offres'),
      ('bpu_catalogues', 'catalogues'),
      ('bpu_lignes', 'catalogues'),
      ('fournisseurs_commerciaux', 'fournisseurs'),
      ('prospection_suivi', 'prospection'),
      ('prospection_commune_suivi', 'prospection'),
      ('ce_dossiers', 'ce'),
      ('commerce_settings', 'admin')
    ) as t(tbl, mod)
  loop
    perform public.commerce_apply_module_policies(rec.tbl, rec.mod);
  end loop;
end $$;

-- clients : AO ou catalogues
alter table public.clients enable row level security;
drop policy if exists commerce_select on public.clients;
drop policy if exists commerce_write on public.clients;
create policy commerce_select on public.clients
  for select to authenticated
  using (
    public.commerce_can_read_module(auth.uid(), 'appels_offres')
    or public.commerce_can_read_module(auth.uid(), 'catalogues')
  );
create policy commerce_write on public.clients
  for all to authenticated
  using (
    public.commerce_can_edit_module(auth.uid(), 'appels_offres')
    or public.commerce_can_edit_module(auth.uid(), 'catalogues')
  )
  with check (
    public.commerce_can_edit_module(auth.uid(), 'appels_offres')
    or public.commerce_can_edit_module(auth.uid(), 'catalogues')
  );

-- sociétés : lecture pour tout accès, écriture admin
alter table public.societes_exploitation enable row level security;
drop policy if exists commerce_select on public.societes_exploitation;
drop policy if exists commerce_write on public.societes_exploitation;
create policy commerce_select on public.societes_exploitation
  for select to authenticated
  using (public.commerce_has_access());
create policy commerce_write on public.societes_exploitation
  for all to authenticated
  using (public.commerce_can_edit_module(auth.uid(), 'admin'))
  with check (public.commerce_can_edit_module(auth.uid(), 'admin'));

-- caches ERP : lecture globale, écriture admin
do $$
declare
  _tbl text;
begin
  foreach _tbl in array array[
    'erp_cache_sync_runs', 'erp_cache_employes', 'erp_cache_clients', 'erp_cache_fournisseurs'
  ]
  loop
    execute format('alter table public.%I enable row level security', _tbl);
    execute format('drop policy if exists commerce_select on public.%I', _tbl);
    execute format('drop policy if exists commerce_write on public.%I', _tbl);
    execute format(
      'create policy commerce_select on public.%I for select to authenticated using (public.commerce_has_access())',
      _tbl
    );
    execute format(
      'create policy commerce_write on public.%I for all to authenticated using (public.commerce_can_edit_module(auth.uid(), ''admin'')) with check (public.commerce_can_edit_module(auth.uid(), ''admin''))',
      _tbl
    );
  end loop;
end $$;

-- allowlist emails : lecture gestionnaires uniquement
alter table public.commerce_allowed_emails enable row level security;
drop policy if exists commerce_select on public.commerce_allowed_emails;
drop policy if exists commerce_write on public.commerce_allowed_emails;
create policy commerce_select on public.commerce_allowed_emails
  for select to authenticated
  using (public.commerce_can_manage_accounts(auth.uid()));

-- storage AO documents
drop policy if exists "commerce select ao documents storage" on storage.objects;
drop policy if exists "commerce insert ao documents storage" on storage.objects;
drop policy if exists "commerce update ao documents storage" on storage.objects;
drop policy if exists "commerce delete ao documents storage" on storage.objects;

create policy "commerce select ao documents storage"
  on storage.objects for select to authenticated
  using (bucket_id = 'ao-documents' and public.commerce_can_read_module(auth.uid(), 'appels_offres'));

create policy "commerce insert ao documents storage"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ao-documents' and public.commerce_can_edit_module(auth.uid(), 'appels_offres'));

create policy "commerce update ao documents storage"
  on storage.objects for update to authenticated
  using (bucket_id = 'ao-documents' and public.commerce_can_edit_module(auth.uid(), 'appels_offres'))
  with check (bucket_id = 'ao-documents' and public.commerce_can_edit_module(auth.uid(), 'appels_offres'));

create policy "commerce delete ao documents storage"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ao-documents' and public.commerce_can_edit_module(auth.uid(), 'appels_offres'));

-- ---------------------------------------------------------------------------
-- RPCs métier : respect modules
-- ---------------------------------------------------------------------------

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
  if not public.commerce_can_edit_module(auth.uid(), 'catalogues') then
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

create or replace function public.import_ao_reponse_lignes(
  p_reponse_id uuid,
  p_lignes jsonb,
  p_replace boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ligne jsonb;
  v_count integer := 0;
  v_qte numeric;
  v_pu numeric;
  v_montant numeric;
begin
  if not public.commerce_can_edit_module(auth.uid(), 'appels_offres') then
    raise exception 'Accès refusé';
  end if;

  if p_replace then
    delete from public.ao_reponse_lignes where reponse_id = p_reponse_id;
  end if;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    v_qte := coalesce(nullif(v_ligne->>'quantite', '')::numeric, 1);
    v_pu := coalesce(nullif(v_ligne->>'pu_ht', '')::numeric, 0);
    v_montant := round(v_qte * v_pu, 2);

    insert into public.ao_reponse_lignes (
      reponse_id, bpu_ligne_id, numero_prix, designation, unite,
      quantite, pu_ht, montant, ordre
    ) values (
      p_reponse_id,
      nullif(v_ligne->>'bpu_ligne_id', '')::uuid,
      coalesce(v_ligne->>'numero_prix', ''),
      coalesce(v_ligne->>'designation', ''),
      nullif(v_ligne->>'unite', ''),
      v_qte,
      v_pu,
      v_montant,
      coalesce(nullif(v_ligne->>'ordre', '')::integer, v_count)
    );
    v_count := v_count + 1;
  end loop;

  perform public.recalc_ao_reponse_montant(p_reponse_id);
  return v_count;
end;
$$;

create or replace function public.get_ao_comments(p_ao_id uuid, p_limit integer default 50)
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
    and public.commerce_can_read_module(auth.uid(), 'appels_offres')
  order by c.created_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

create or replace function public.post_ao_comment(p_ao_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_body text;
  v_comment_id uuid;
begin
  if not public.commerce_can_edit_module(auth.uid(), 'appels_offres') then
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

comment on table public.commerce_user_module_access is
  'ACL modules commerce : viewer = lecture, editor = écriture. Aucune ligne = accès total (legacy). _aucun = aucun module.';
comment on table public.commerce_account_manager_emails is
  'Emails autorisés à créer / paramétrer les comptes commerce.';
comment on function public.commerce_get_my_session() is
  'Session ACL commerce : modules, modules éditeur, can_manage_accounts.';

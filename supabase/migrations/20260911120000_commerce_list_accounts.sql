-- Liste des comptes autorisés (allowlist + profil + métadonnées auth).

create or replace function public.commerce_list_accounts()
returns table (
  email text,
  user_id uuid,
  prenom text,
  nom text,
  telephone text,
  allowed_at timestamptz,
  last_sign_in_at timestamptz,
  has_auth_user boolean
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.commerce_has_access() then
    raise exception 'Accès commerce requis';
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
    (u.id is not null) as has_auth_user
  from public.commerce_allowed_emails cae
  left join auth.users u on lower(u.email) = lower(cae.email)
  left join public.commerce_profiles p on p.user_id = u.id
  order by cae.email;
end;
$$;

revoke all on function public.commerce_list_accounts() from public;
grant execute on function public.commerce_list_accounts() to authenticated;

comment on function public.commerce_list_accounts() is
  'Comptes autorisés RMS Commerce (allowlist + profil + dernière connexion).';

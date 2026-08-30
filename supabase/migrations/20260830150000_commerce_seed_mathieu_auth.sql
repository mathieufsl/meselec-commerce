-- Compte initial commerce : mathieu.faessel@meselec.fr

insert into public.commerce_allowed_emails (email)
values ('mathieu.faessel@meselec.fr')
on conflict (email) do nothing;

do $$
declare
  v_user_id uuid;
  v_email text := 'mathieu.faessel@meselec.fr';
begin
  select id into v_user_id from auth.users where lower(email) = lower(v_email);

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt('mathieu2003', extensions.gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Mathieu","full_name":"Mathieu Faessel"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  else
    update auth.users
    set
      encrypted_password = extensions.crypt('mathieu2003', extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || '{"first_name":"Mathieu","full_name":"Mathieu Faessel"}'::jsonb,
      updated_at = now()
    where id = v_user_id;
  end if;
end $$;

insert into public.commerce_profiles (user_id, prenom, nom)
select id, 'Mathieu', 'Faessel'
from auth.users
where lower(email) = lower('mathieu.faessel@meselec.fr')
on conflict (user_id) do update
set
  prenom = excluded.prenom,
  nom = excluded.nom,
  updated_at = now();

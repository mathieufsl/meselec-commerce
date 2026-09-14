-- Contacts typés (maire, DST, …) pour le suivi prospection EP.
alter table public.prospection_commune_suivi
  add column if not exists contacts_json jsonb not null default '[]'::jsonb;

-- Migre le champ texte libre « contact » vers un contact de type « autre ».
update public.prospection_commune_suivi
set contacts_json = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', 'autre',
    'nom', contact,
    'telephone', '',
    'email', ''
  )
)
where coalesce(trim(contact), '') <> ''
  and contacts_json = '[]'::jsonb;

comment on column public.prospection_commune_suivi.contacts_json is
  'Liste de contacts EP [{id,type,nom,telephone,email}] — types: maire|dst|elu|technique|autre';

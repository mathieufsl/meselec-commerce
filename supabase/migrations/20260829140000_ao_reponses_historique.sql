-- Historique des réponses AO + import Excel

alter table public.ao_reponses
  add column if not exists libelle text not null default 'Réponse',
  add column if not exists source_fichier text null,
  add column if not exists version int not null default 1;

alter table public.bpu_catalogues
  add column if not exists secteur text null check (secteur in ('EP', 'Tertiaire', 'Enedis')),
  add column if not exists source_fichier text null;

create unique index if not exists ao_reponses_ao_version_uidx
  on public.ao_reponses (ao_id, version);

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
  if not public.commerce_has_access() then
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

grant execute on function public.import_ao_reponse_lignes(uuid, jsonb, boolean) to authenticated;

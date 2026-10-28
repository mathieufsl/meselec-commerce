-- Prospection : une commune suivie par quelqu'un (colonne « Qui ») a une porte d'entrée.
update public.prospection_commune_suivi
set porte_entree = 'oui'
where responsables <> '{}'::text[]
  and coalesce(porte_entree, '') = '';

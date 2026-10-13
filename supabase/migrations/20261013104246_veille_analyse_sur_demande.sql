-- Veille AO : l'analyse du DCE n'est plus automatique, elle est demandée
-- annonce par annonce depuis la page Veille (analyse_statut = 'a_faire').

alter table public.veille_annonces alter column analyse_statut set default 'non_demande';

-- Les annonces encore en attente sans aucune analyse repassent en « non demandé ».
update public.veille_annonces
  set analyse_statut = 'non_demande'
  where analyse_statut = 'a_faire'
    and analyse_at is null
    and analyse_tentatives = 0;

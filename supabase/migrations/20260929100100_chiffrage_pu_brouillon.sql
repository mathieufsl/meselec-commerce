-- PU du brouillon de chiffrage, conservé à côté du PU de l'offre déposée (qui fait foi).
alter table public.chiffrage_postes
  add column if not exists pu_brouillon_ht numeric(14,4) null;

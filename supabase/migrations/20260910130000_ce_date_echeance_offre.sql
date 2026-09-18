-- Date d'échéance d'offre (procédure de redressement)

alter table public.ce_dossiers
  add column if not exists date_echeance_offre date null;

create index if not exists ce_dossiers_echeance_offre_idx
  on public.ce_dossiers (date_echeance_offre)
  where date_echeance_offre is not null;

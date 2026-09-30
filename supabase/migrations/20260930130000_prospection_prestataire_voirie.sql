-- Prestataire voirie (distinct du prestataire EP)
alter table public.prospection_commune_suivi
  add column if not exists prestataire_voirie text not null default '';

alter table public.veille_annonces add column if not exists mail_envoye_at timestamptz;
comment on column public.veille_annonces.mail_envoye_at is 'Date du mail quotidien qui a présenté cette annonce (null = jamais envoyée).';
-- Tout ce qui existe déjà a été vu (mail de ce matin ou écran Veille).
update public.veille_annonces set mail_envoye_at = now() where mail_envoye_at is null and qualif_statut = 'qualifie';
create index if not exists veille_annonces_mail_a_envoyer on public.veille_annonces (created_at) where mail_envoye_at is null;

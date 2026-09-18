-- Aligner les tables veille / digest sur le module appels_offres (ou admin).

do $$
begin
  if to_regclass('public.veille_annonces') is not null then
    drop policy if exists "veille_annonces_read" on public.veille_annonces;
    drop policy if exists "veille_annonces_write" on public.veille_annonces;
    create policy "veille_annonces_read" on public.veille_annonces
      for select to authenticated
      using (public.commerce_can_read_module(auth.uid(), 'appels_offres'));
    create policy "veille_annonces_write" on public.veille_annonces
      for all to authenticated
      using (public.commerce_can_edit_module(auth.uid(), 'appels_offres'))
      with check (public.commerce_can_edit_module(auth.uid(), 'appels_offres'));
  end if;

  if to_regclass('public.veille_email_recipients') is not null then
    drop policy if exists "commerce read veille recipients" on public.veille_email_recipients;
    drop policy if exists "commerce manage veille recipients" on public.veille_email_recipients;
    create policy "commerce read veille recipients" on public.veille_email_recipients
      for select to authenticated
      using (public.commerce_can_read_module(auth.uid(), 'admin'));
    create policy "commerce manage veille recipients" on public.veille_email_recipients
      for all to authenticated
      using (public.commerce_can_edit_module(auth.uid(), 'admin'))
      with check (public.commerce_can_edit_module(auth.uid(), 'admin'));
  end if;

  if to_regclass('public.veille_digest_runs') is not null then
    drop policy if exists "commerce read veille digest runs" on public.veille_digest_runs;
    create policy "commerce read veille digest runs" on public.veille_digest_runs
      for select to authenticated
      using (public.commerce_can_read_module(auth.uid(), 'admin'));
  end if;
end $$;

-- DCE déposé à la main depuis la page Veille (quand le robot ne peut pas le
-- télécharger) : les éditeurs AO écrivent dans `veille-dce/<annonce>/depot/`,
-- le robot lit ces pièces au lieu d'aller sur la plateforme.
drop policy if exists "commerce depot veille dce storage" on storage.objects;
create policy "commerce depot veille dce storage"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'veille-dce'
    and (storage.foldername(name))[2] = 'depot'
    and public.commerce_can_edit_module(auth.uid(), 'appels_offres')
  );

drop policy if exists "commerce depot veille dce storage delete" on storage.objects;
create policy "commerce depot veille dce storage delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'veille-dce'
    and (storage.foldername(name))[2] = 'depot'
    and public.commerce_can_edit_module(auth.uid(), 'appels_offres')
  );

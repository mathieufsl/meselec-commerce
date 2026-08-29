-- Storage partagé pour les pièces d'appels d'offres (DCE, réponse, annexes…)

alter table public.ao_documents
  add column if not exists storage_path text null,
  add column if not exists taille_octets bigint null,
  add column if not exists mime_type text null,
  add column if not exists uploaded_by uuid null references auth.users(id) on delete set null,
  add column if not exists uploaded_by_email text null;

alter table public.ao_documents drop constraint if exists ao_documents_type_check;
alter table public.ao_documents add constraint ao_documents_type_check
  check (type in (
    'dce', 'rc', 'cctp', 'ae', 'dpgf', 'bpu', 'memoire', 'reponse', 'annexe', 'autre'
  ));

create index if not exists ao_documents_storage_path_idx
  on public.ao_documents (storage_path)
  where storage_path is not null;

insert into storage.buckets (id, name, public, file_size_limit)
values ('ao-documents', 'ao-documents', false, 52428800)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit;

drop policy if exists "commerce select ao documents storage" on storage.objects;
drop policy if exists "commerce insert ao documents storage" on storage.objects;
drop policy if exists "commerce update ao documents storage" on storage.objects;
drop policy if exists "commerce delete ao documents storage" on storage.objects;

create policy "commerce select ao documents storage"
  on storage.objects for select to authenticated
  using (bucket_id = 'ao-documents' and public.commerce_has_access());

create policy "commerce insert ao documents storage"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ao-documents' and public.commerce_has_access());

create policy "commerce update ao documents storage"
  on storage.objects for update to authenticated
  using (bucket_id = 'ao-documents' and public.commerce_has_access())
  with check (bucket_id = 'ao-documents' and public.commerce_has_access());

create policy "commerce delete ao documents storage"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ao-documents' and public.commerce_has_access());

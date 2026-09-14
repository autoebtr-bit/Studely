-- ============================================================================
-- 0007 — Buckets de stockage
--
-- Règle de cloisonnement : tout fichier d'un utilisateur vit sous un préfixe
-- `{user_id}/`. Les policies comparent le premier segment du chemin à
-- `auth.uid()`, ce qui interdit structurellement de lire le dossier d'autrui.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'documents', 'documents', false, 20971520,
    array[
      'application/pdf', 'text/plain', 'text/markdown',
      'image/png', 'image/jpeg', 'image/webp'
    ]
  ),
  (
    'avatars', 'avatars', true, 2097152,
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do nothing;

/* ------------------------------------------- documents : strictement privé -- */

create policy "documents_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

/* ------------------------------ avatars : lecture publique, écriture privée -- */

create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

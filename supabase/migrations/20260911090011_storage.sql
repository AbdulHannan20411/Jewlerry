-- =============================================================================
-- 0011: Storage buckets + storage.objects RLS.
--
-- Path convention (first path segment is always the "owner" folder used by
-- the owner-scoped policies below):
--   avatars/{user_id}/{filename}
--   payment-proofs/{user_id}/{order_id}/{filename}
--   product-images/{product_id}/{filename}   (admin-managed)
--   banners/{banner_id}/{filename}           (admin-managed)
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('banners', 'banners', true),
  ('avatars', 'avatars', true),
  ('payment-proofs', 'payment-proofs', false) -- PRIVATE: never publicly readable
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- avatars — customer manages their own folder; publicly readable (public
-- bucket, so SELECT doesn't need an RLS policy at all).
-- ---------------------------------------------------------------------------
create policy "avatars_owner_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update" on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete" on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- payment-proofs — PRIVATE. Customer can upload into their own folder and
-- read back their own uploads (e.g. to confirm what they sent); only admin
-- can read everyone's. Nothing is ever mutated or deleted by a customer —
-- it's evidence. Admin never gets a public URL for these, only short-lived
-- signed URLs generated server-side (see lib/storage/payment-proofs.ts).
-- ---------------------------------------------------------------------------
create policy "payment_proofs_owner_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "payment_proofs_owner_or_admin_select" on storage.objects
  for select
  using (
    bucket_id = 'payment-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_role_is_admin()
    )
  );

create policy "payment_proofs_admin_delete" on storage.objects
  for delete
  using (
    bucket_id = 'payment-proofs'
    and public.current_role_is_admin()
  );

-- ---------------------------------------------------------------------------
-- product-images / banners — admin-managed, publicly readable (public
-- buckets; SELECT doesn't need an RLS policy).
-- ---------------------------------------------------------------------------
create policy "product_images_admin_write" on storage.objects
  for insert
  with check (bucket_id = 'product-images' and public.current_role_is_admin());

create policy "product_images_admin_update" on storage.objects
  for update
  using (bucket_id = 'product-images' and public.current_role_is_admin());

create policy "product_images_admin_delete" on storage.objects
  for delete
  using (bucket_id = 'product-images' and public.current_role_is_admin());

create policy "banners_admin_write" on storage.objects
  for insert
  with check (bucket_id = 'banners' and public.current_role_is_admin());

create policy "banners_admin_update" on storage.objects
  for update
  using (bucket_id = 'banners' and public.current_role_is_admin());

create policy "banners_admin_delete" on storage.objects
  for delete
  using (bucket_id = 'banners' and public.current_role_is_admin());

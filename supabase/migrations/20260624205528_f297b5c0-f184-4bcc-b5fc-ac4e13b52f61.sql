
-- server-files bucket: path prefix is "<server_id>/..."
CREATE POLICY "server_files_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'server-files'
    AND EXISTS (
      SELECT 1 FROM public.servers s
      WHERE s.id::text = split_part(name, '/', 1)
        AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "server_files_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'server-files'
    AND EXISTS (
      SELECT 1 FROM public.servers s
      WHERE s.id::text = split_part(name, '/', 1)
        AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "server_files_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'server-files'
    AND EXISTS (
      SELECT 1 FROM public.servers s
      WHERE s.id::text = split_part(name, '/', 1)
        AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "server_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'server-files'
    AND EXISTS (
      SELECT 1 FROM public.servers s
      WHERE s.id::text = split_part(name, '/', 1)
        AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- avatars: each user can read/write own folder
CREATE POLICY "avatar_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "avatar_write_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "avatar_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

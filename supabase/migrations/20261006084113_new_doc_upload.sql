-- Product rules this migration implements:
--   * Any signed-in user (member or admin) can upload.
--   * A mentor or mentee can see and read only their OWN documents.
--   * admin and super_admin can see every document (and delete any, through the server).
--   * Chat and search can read EVERY ready document, whoever uploaded it, and show the title, uploader and passage.
--   * The same person cannot upload the same file twice; two different people may each upload it.
-- Writes (insert, rename, delete) still happen server-side with the service role, which also handles Storage.

-- ---------------------------------------------------------------------------
-- 1. Members see only their own documents (admins keep documents_select_admin from the RAG migration).
--    document_chunks follows automatically: its policy only shows chunks whose document the caller can see.
-- ---------------------------------------------------------------------------
drop policy if exists documents_select_members on public.documents;

create policy documents_select_own on public.documents
  for select to authenticated
  using (uploaded_by = (select auth.uid()) and (select public.is_active_member()));

-- ---------------------------------------------------------------------------
-- 2. Duplicate files: unique per uploader instead of unique across everyone, so one member's upload never
--    reveals (through an error) that someone else uploaded the same file.
-- ---------------------------------------------------------------------------
alter table public.documents drop constraint if exists documents_content_hash_key;
alter table public.documents
  add constraint documents_uploader_content_hash_key unique (uploaded_by, content_hash);

create index if not exists documents_uploaded_by_created_idx
  on public.documents (uploaded_by, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Search across all documents.
--    The old function was SECURITY INVOKER, so with the new RLS it would only ever search the caller's own files.
--    This one is SECURITY DEFINER on purpose: it must see everyone's ready documents. It refuses callers who are not
--    active members, and it ignores documents whose uploader is inactive or soft-deleted.
--    It also returns who uploaded the document and the original file name for citations.
-- ---------------------------------------------------------------------------
drop function if exists public.match_document_chunks(extensions.vector, integer, double precision);

create function public.match_document_chunks(
  query_embedding extensions.vector(1536),
  match_count     integer default 5,
  min_similarity  double precision default 0
)
returns table (
  chunk_id          uuid,
  document_id       uuid,
  document_title    text,
  original_filename text,
  uploaded_by       uuid,
  uploader_name     text,
  page_number       integer,
  content           text,
  similarity        double precision
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not (select public.is_active_member()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    d.id,
    d.title,
    d.original_filename,
    d.uploaded_by,
    p.full_name,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding)
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  join public.profiles  p on p.id = d.uploaded_by
  where d.status = 'ready'
    and p.status = 'active'
    and p.deleted_at is null
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
end;
$$;

revoke execute on function public.match_document_chunks(extensions.vector, integer, double precision) from public, anon;
grant  execute on function public.match_document_chunks(extensions.vector, integer, double precision) to authenticated;

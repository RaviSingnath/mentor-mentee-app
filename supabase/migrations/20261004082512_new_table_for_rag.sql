-- RAG knowledge base (runs after 20261003130000_domain_schema.sql)
-- Replaces the earlier 20261002150000_rag_schema.sql draft, which assumed a different profiles table.
--
-- Model: any active member uploads; all active members search all documents.
-- Rule: data from inactive (or soft-deleted) users is never used, so documents whose uploader is not
-- active drop out of search, even for admins.
-- Writes (insert/update/delete) happen server-side with the service role, because they also touch
-- Storage and call the Gemini API. Clients only get SELECT.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Helper: is this profile active and not soft-deleted? (SECURITY DEFINER: members can't read other profiles)
-- ---------------------------------------------------------------------------
create or replace function public.is_active_profile(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_id and status = 'active' and deleted_at is null
  );
$$;

revoke execute on function public.is_active_profile(uuid) from public, anon;
grant  execute on function public.is_active_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create type public.document_status as enum ('uploaded', 'processing', 'ready', 'failed');

create table public.documents (
  id                uuid primary key default gen_random_uuid(),
  uploaded_by       uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 200),
  original_filename text not null,
  storage_path      text not null unique,
  mime_type         text not null check (mime_type in (
                      'application/pdf',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes        bigint not null check (size_bytes > 0 and size_bytes <= 10485760),  -- 10 MB
  content_hash      text unique,
  status            public.document_status not null default 'uploaded',
  error_message     text,
  chunk_count       integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index documents_uploaded_by_idx on public.documents (uploaded_by);
create index documents_status_idx on public.documents (status);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- document_chunks: vector(1536) -> the app must request output_dimensionality = 1536 from Gemini Embedding 2.
-- (HNSW on a plain vector column supports at most 2000 dimensions; the model default is 3072.)
-- ---------------------------------------------------------------------------
create table public.document_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content     text not null,
  token_count integer,
  page_number integer,
  embedding   extensions.vector(1536) not null,
  created_at  timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index document_chunks_document_idx on public.document_chunks (document_id);
create index document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Row Level Security: reads only
-- ---------------------------------------------------------------------------
alter table public.documents       enable row level security;
alter table public.document_chunks enable row level security;

-- Members see documents from active uploaders. Admins see everything (to manage inactive users' uploads).
create policy documents_select_members on public.documents
  for select to authenticated
  using ((select public.is_active_member()) and (select public.is_active_profile(uploaded_by)));

create policy documents_select_admin on public.documents
  for select to authenticated
  using ((select public.is_admin()));

-- Chunks are visible exactly when their document is (the subquery runs through documents' RLS).
create policy document_chunks_select on public.document_chunks
  for select to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id));

revoke all on public.documents, public.document_chunks from anon, authenticated;
grant select on public.documents, public.document_chunks to authenticated;

-- ---------------------------------------------------------------------------
-- Similarity search (cosine). SECURITY INVOKER, so RLS applies to the caller, plus an explicit
-- filter so that even admins' searches ignore inactive uploaders' documents.
-- ---------------------------------------------------------------------------
create or replace function public.match_document_chunks(
  query_embedding extensions.vector(1536),
  match_count     integer default 5,
  min_similarity  double precision default 0
)
returns table (
  chunk_id       uuid,
  document_id    uuid,
  document_title text,
  page_number    integer,
  content        text,
  similarity     double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    c.id,
    c.document_id,
    d.title,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where d.status = 'ready'
    and public.is_active_profile(d.uploaded_by)
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

revoke execute on function public.match_document_chunks(extensions.vector, integer, double precision) from public, anon;
grant  execute on function public.match_document_chunks(extensions.vector, integer, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket. No storage.objects policies on purpose: uploads use server-issued signed upload
-- URLs and the server reads files with the service role, so browsers get no direct bucket access.
-- Deleting a profile cascades to its documents rows but NOT to the stored files; the delete code must
-- remove the Storage objects.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

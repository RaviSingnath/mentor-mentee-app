-- A conversation belongs to one person; its messages are that person's question and the assistant's answer.
-- Each assistant message keeps a snapshot of the passages it cited (document title, uploader, page, quoted text),
-- so the citations still read correctly after a document is renamed or deleted.
--
-- Who can read what: a member reads only their own conversations, admins included (chats are private even from admins).
-- Writes happen on the server with the service role, because saving an answer goes together with searching documents
-- and calling Gemini. Clients only get SELECT.

create type public.message_role as enum ('user', 'assistant');

create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null default 'New chat' check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role            public.message_role not null,
  content         text not null check (char_length(content) between 1 and 20000),
  -- [{ "n": 1, "chunk_id": "...", "document_id": "...", "title": "...", "uploader_name": "...",
  --    "page": 2, "passage": "...", "similarity": 0.83 }]  (empty for user messages)
  sources         jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  created_at      timestamptz not null default now()
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

create policy conversations_select_own on public.conversations
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_member()));

-- Messages are visible exactly when their conversation is (the subquery runs through the conversations policy).
create policy messages_select_own on public.messages
  for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id));

revoke all on public.conversations, public.messages from anon, authenticated;
grant select on public.conversations, public.messages to authenticated;

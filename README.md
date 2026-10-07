# Mentor Mentee App

Mentor/mentee matching with a document-grounded chatbot. All data is fictional.

- **Live app:** `TODO: https://mentor-mentee-nu.vercel.app`
- **Demo video:** `Codebase: https://www.loom.com/share/5f1ce62739224c0ab71aa07dfa9e1aef`
- **Demo video:** `Live Site: https://www.loom.com/share/df3d364772514107a4178d80579baa6a`
- **Demo video:** `Live Site: https://www.loom.com/share/8423fe381569495d9677c25c659c5f0e`


## Reviewer access

- Registration is open: sign up, confirm the email, then complete your profile at `/profile`.
- Test account (Super Admin): `super.admin.mm@yopmail.com` / `123456`, role: `super_admin`.
- Test account (Mentor): `demo-tech-mentor-01@yopmail.com` / `123456`, role: `mentor`.
- Test account (Mentee): `demo-tech-mentee-01@yopmail.com` / `123456`, role: `mentee`.

The demo data (20 mentees, 50 mentors) (`/seed`) and the 8 sample documents (`/documents`) are already loaded on the live app.

## Stack and services

| Layer                | Service                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Frontend and backend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, react-hook-form, Zod           |
| Hosting              | Vercel Hobby                                                                              |
| Auth                 | Supabase Auth (email and password, email confirmation)                                    |
| SQL and vectors      | Supabase Postgres with pgvector, and Supabase Storage                                     |
| LLM and embeddings   | Gemini Developer API free tier: a Flash model, and `gemini-embedding-2` (1536 dimensions) |

**Deviation from the brief:** Supabase is used for auth and for all data (no Firebase Auth or Firestore). Access rules are enforced once, in Postgres row-level security, instead of across three places. Chat history, saved matches and interaction logs are Postgres tables (one JSONB column for cited sources).

## Setup

```bash
npm install
cp .env.example .env.local     # fill in the values
npm run dev                    # http://localhost:3000
npm test
```

1. Run the SQL files in `supabase/migrations/` in order, then enable the Custom Access Token Hook (Supabase, Authentication, Hooks) so tokens carry `user_role` and `profile_status`.
2. Supabase, Authentication, URL Configuration: set the Site URL and add `<your-url>/**` to Redirect URLs.
3. Sign up, confirm the email, and set your role to `super_admin` in the `profiles` table.
4. Open `/seed` to load the demo profiles, then upload the files at `/documents`.

## Architecture

```
Browser -> Next.js server (Vercel) -> Supabase (Auth, Postgres + pgvector, Storage)
                                   -> Gemini API (key stays server-side)
```

Every server action and API route re-checks the session, role and active status. Browsers have read-only access through row-level security; all writes run on the server.

## Data model

- **Profiles and matching:** `profiles`, `topics`, `profile_topics` (skill, goal or interest), `availability_slots`, `saved_matches`, `match_interactions`.
- **Documents and RAG:** `documents`, `document_chunks` (`vector(1536)`, HNSW cosine index).
- **Chat:** `conversations`, `messages` (cited sources saved as JSONB).

## Matching

Dataset A is the mentees (20) and Dataset B the mentors (50); it also works in reverse. The score is out of 100 from six weighted signals, so ranking is deterministic and each result carries reasons:

| Signal           | Weight | Rule                                                              |
| ---------------- | -----: | ----------------------------------------------------------------- |
| Skills vs. goals |     35 | share of the mentee's goals the mentor's skills cover             |
| Availability     |     20 | weekly overlap after time-zone conversion (full marks at 2 hours) |
| Language         |     15 | any shared language                                               |
| Experience       |     15 | best when the mentor is 2 levels above the mentee                 |
| Interests        |     10 | shared interests over the smaller list                            |
| Location         |      5 | same city 1.0, state 0.75, country 0.5                            |

The top 5 are shown with the score, 2-3 reasons each and this explanation. An empty profile gets no matches, only a prompt to fill it in.

## RAG chatbot

- **Ingestion:** PDF or Word (up to 10 MB) goes to private storage, the text is extracted, split into about 3,200-character chunks (400 overlap, never crossing pages), embedded in batches of 20 and stored in pgvector. It resumes after an interruption.
- **Retrieval:** the question is embedded, and the 6 closest chunks above similarity 0.3 are retrieved across all active members' documents.
- **Answer:** only those chunks go to the model, which must cite them as [1], [2]. Each citation shows title, uploader, page and the quoted passage.
- **Not supported:** if nothing relevant is found, it replies "I can't find this in the uploaded documents." without calling the model.
- **Quota:** when the free Gemini limit is reached, the chat shows a clear message and a Try again button. Overload is retried, and an optional fallback model is used.

## Environment variables

Names only; see `.env.example`.

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL`, `GEMINI_CHAT_MODEL`, `GEMINI_CHAT_FALLBACK_MODEL`, `SITE_URL`, `SEED_PASSWORD`, `SEED_EMAIL_DOMAIN`

## Known limitations and next steps

- The free Gemini tier is small (about 20 chat requests a day per model). Next: a per-user daily cap and a paid tier.
- The similarity cutoff is untuned and there is no hybrid search. Next: an evaluation set, tuning and reranking.
- Character-based chunking and no OCR for scanned PDFs.
- Built-in Supabase email is rate limited. Next: custom SMTP.

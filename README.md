# PulseFlow AI

**Content-driven outreach automation SaaS.** Upload content assets (blogs, docs, YouTube links), vectorize them into a semantic knowledge base, fetch leads, and generate **hyper-personalized cold outreach** grounded in your own content using a RAG pipeline + Google Gemini.

This repo is a **monorepo**:

```
.
├── backend/     # Express API: RAG knowledge base, campaigns, Gemini outreach worker
└── frontend/    # React (Vite + TS + Tailwind): landing page + dashboard
```

> Evolved from a lightweight email-automation demo into the PulseFlow AI platform described in the SRS. The original Gemini email generator and Apollo CSV parsing were salvaged and now power the new outreach worker and lead sourcing.

> The authoritative product spec lives in [`SRS.md`](./SRS.md). Keep it updated
> with every functional change.

## Highlights

- **Auth (JWT):** signup/login/refresh, bcrypt-hashed passwords, protected
  routes, per-user data isolation. Public landing/auth pages vs private dashboard.
- **Semantic Knowledge Base (RAG):** LangChain `RecursiveCharacterTextSplitter`
  → HuggingFace embeddings (`all-MiniLM-L6-v2`, 384-dim) → Supabase pgvector with
  cosine retrieval.
- **Campaigns (n8n + Apollo):** "Launch Campaign" triggers an n8n workflow that
  fetches leads from Apollo and posts them back to secured worker endpoints.
- **Outreach worker (LangChain + Gemini):** retrieves top-2 context chunks and
  generates a structured email (Zod schema) via Gemini 1.5 Flash.
- **Strict integration policy — no fallbacks.** Each capability **fails fast**
  with a clear `503 NOT_CONFIGURED` error if its env vars are missing:
  | Capability | Required provider |
  | --- | --- |
  | Auth + Database | Supabase (Postgres + pgvector) + JWT secrets |
  | Embeddings | HuggingFace Inference API |
  | LLM | Google Gemini or Groq (via LangChain; set `LLM_PROVIDER`) |
  | Leads | Apollo.io (called by n8n) |
  | Automation | n8n webhook |

## Tech stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, lucide-react
- **Backend:** Node.js + Express, JWT (`jsonwebtoken` + `bcryptjs`), LangChain
  (`@langchain/google-genai`, `@langchain/textsplitters`), `@huggingface/inference`,
  `@supabase/supabase-js`
- **Data model (SRS §6):** `app_users`, `knowledge_base`, `document_chunks`
  (`vector(384)`), `leads_campaign`

## Quick start

```bash
# from the repo root (installs both workspaces)
npm install

# run backend (http://localhost:3000) + frontend (http://localhost:5173) together
npm run dev
```

Then open **http://localhost:5173** — user app at `/dashboard`, admin at `/admin/login`.

### Admin setup

1. Apply `backend/db/schema.sql` (or `backend/db/migrations/002_admin.sql` if upgrading).
2. Set `JWT_ADMIN_ACCESS_SECRET`, `JWT_ADMIN_REFRESH_SECRET` (different from user JWT).
3. Set `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` — on first server start,
   a `super_admin` is created if no admins exist.
4. Sign in at **http://localhost:5173/admin/login**.

Run them individually if you prefer:

```bash
npm run dev:backend
npm run dev:frontend
```

## Configuration (required — no fallbacks)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env   # optional (prod API base URL)
```

Set up steps:

1. **Supabase:** create a project, then run `backend/db/schema.sql` in the SQL
   editor (enables `vector`/`pgcrypto`, creates `app_users`, `knowledge_base`,
   `document_chunks`, `leads_campaign`, and the `match_document_chunks` RPC).
   Put `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`.
2. **JWT secrets:** set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
   `WORKER_SHARED_SECRET` (use `openssl rand -hex 32`).
3. **LLM:** `GEMINI_API_KEY` (Google AI Studio) **or** `GROQ_API_KEY` (Groq console).
   Set `LLM_PROVIDER=gemini` (default) or `LLM_PROVIDER=groq`.
4. **HuggingFace:** `HUGGINGFACE_API_KEY` (free Inference API token).
5. **n8n + Apollo:** import `backend/n8n/pulseflow-campaign.workflow.json` into n8n,
   toggle the workflow **Active**, set `APOLLO_API_KEY`, `WORKER_URL`, `WORKER_SHARED_SECRET`
   in n8n Docker env, then put the production webhook URL in **backend** `.env` as
   `N8N_LAUNCH_WEBHOOK_URL` (e.g. `http://localhost:5678/webhook/pulseflow-launch`).
   This is **not** a frontend variable — the React app calls `POST /api/campaigns` and the
   backend triggers n8n. Verify with `npm run check:n8n --workspace backend`.

`GET /api/health` reports which capabilities are configured.

## API overview

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | public | Configured-integration status |
| POST | `/api/auth/signup` · `/login` · `/refresh` · `/logout` | public | Auth |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/stats` | JWT | Knowledge / lead counts |
| GET/POST | `/api/knowledge` · DELETE `/:id` | JWT | Ingest / list / remove content |
| GET | `/api/leads` · `/:id` | JWT | List / get leads |
| POST | `/api/campaigns` | JWT | Launch campaign (triggers n8n) |
| POST | `/api/leads/:id/generate` · `/generate-all` | JWT | Generate outreach |
| POST | `/api/worker/leads` · `/generate-outreach` | worker secret | n8n callbacks |

Legacy auxiliary routes (`/generate-email`, `/generate-email-from-apollo`) remain
behind JWT (Module F).

## Deploy (Vercel)

Deploy `backend/` and `frontend/` as **two separate Vercel projects** (set each project's Root Directory accordingly):

- **backend/** ships `vercel.json` + `api/index.js` and bundles `data/**`. Set env vars in project settings.
- **frontend/** is a static SPA (`vercel.json` rewrites all routes to `index.html`). Set `VITE_API_BASE_URL` to the deployed backend origin.

## Supabase schema

Apply `backend/db/schema.sql` in the Supabase SQL editor (enables `vector`, creates the three tables + an HNSW index, and a `match_document_chunks` cosine-search RPC).

# PulseFlow AI

**Content-driven outreach automation SaaS.** Upload content (blogs, docs, PDFs, images, YouTube links), build a semantic knowledge base, fetch leads, and generate **hyper-personalized cold outreach** grounded in your own content using RAG + LLM generation.

This repo is a **monorepo**:

```
.
├── backend/     # Express API (Vercel serverless): RAG knowledge base, campaigns, outreach worker
└── frontend/    # React (Vite + TS + Tailwind): landing page + dashboard
```

> Evolved from a lightweight email-automation demo into the PulseFlow AI platform described in [`SRS.md`](./SRS.md).

## Highlights

- **Auth (JWT):** signup/login/refresh, bcrypt-hashed passwords, protected routes, per-user data isolation. Public landing/auth pages vs private dashboard.
- **Semantic Knowledge Base (RAG):** ingest URLs, pasted text, and file uploads → LangChain chunking → HuggingFace embeddings (`all-MiniLM-L6-v2`, 384-dim) → Supabase pgvector with cosine retrieval.
- **File ingest with vision & OCR:** upload PDF, DOCX, TXT, or images (PNG, JPG, WEBP). Optional **meta analysis** (Groq vision — scene/context description) and **OCR** (text extraction from images and scanned PDFs). Toggles work independently; PDFs can use the embedded text layer only.
- **Campaigns (n8n + Apollo):** "Launch Campaign" triggers an n8n workflow that fetches leads from Apollo and posts them back to secured worker endpoints.
- **Outreach worker (LangChain + Gemini/Groq):** retrieves top context chunks and generates structured outreach email copy.

## Integrations

| Capability | Provider |
| --- | --- |
| Auth + Database | Supabase (Postgres + pgvector) + JWT secrets |
| Embeddings | HuggingFace Inference API |
| LLM (outreach) | Google Gemini or Groq (set `LLM_PROVIDER`) |
| Vision / OCR (ingest) | Groq vision (`GROQ_API_KEY`, `GROQ_MODEL_VISION`) |
| Leads | Apollo.io (called by n8n) |
| Automation | n8n webhook |

## Tech stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, lucide-react
- **Backend:** Node.js + Express (serverless on Vercel), JWT, LangChain, HuggingFace Inference, Supabase
- **Data model:** `app_users`, `knowledge_base`, `document_chunks` (`vector(384)`), `leads_campaign`

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
3. Set `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` — on first server start, a `super_admin` is created if no admins exist.
4. Sign in at **http://localhost:5173/admin/login**.

Run workspaces individually if you prefer:

```bash
npm run dev:backend
npm run dev:frontend
```

## Configuration

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env   # optional (prod API base URL)
```

Setup steps:

1. **Supabase:** create a project, run `backend/db/schema.sql` in the SQL editor (enables `vector`/`pgcrypto`, creates tables + `match_document_chunks` RPC). Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
2. **JWT secrets:** set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `WORKER_SHARED_SECRET`.
3. **LLM:** `GEMINI_API_KEY` or `GROQ_API_KEY`. Set `LLM_PROVIDER=gemini` (default) or `LLM_PROVIDER=groq`.
4. **Vision / OCR:** `GROQ_API_KEY` + `GROQ_MODEL_VISION` for image and scanned-PDF ingest. Tune with `OCR_MIN_TEXT_CHARS`, `OCR_MAX_PDF_PAGES`, `OCR_PDF_SCALE` if needed.
5. **HuggingFace:** `HUGGINGFACE_API_KEY` for embeddings.
6. **n8n + Apollo:** import `backend/n8n/pulseflow-campaign.workflow.json`, toggle **Active**, set `APOLLO_API_KEY`, `WORKER_URL`, `WORKER_SHARED_SECRET` in n8n, then set `N8N_LAUNCH_WEBHOOK_URL` in backend `.env`. Verify with `npm run check:n8n --workspace backend`.

`GET /api/health` reports which integrations are configured.

## API overview

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | public | Integration status |
| POST | `/api/auth/signup` · `/login` · `/refresh` · `/logout` | public | Auth |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/stats` | JWT | Knowledge / lead counts |
| GET/POST | `/api/knowledge` · DELETE `/:id` | JWT | Ingest / list / remove content |
| POST | `/api/knowledge/stream/upload` | JWT | File upload ingest (OCR / meta analysis) |
| POST | `/api/knowledge/search` | JWT | Semantic search over knowledge chunks |
| GET | `/api/leads` · `/:id` | JWT | List / get leads |
| POST | `/api/campaigns` | JWT | Launch campaign (triggers n8n) |
| POST | `/api/leads/:id/generate` · `/generate-all` | JWT | Generate outreach |
| POST | `/api/worker/leads` · `/generate-outreach` | worker secret | n8n callbacks |

## Deploy (Vercel)

Deploy `backend/` and `frontend/` as **two separate Vercel projects** (set each project's Root Directory accordingly):

- **backend/** — serverless entry at `api/index.js` (see `backend/vercel.json`). Set env vars in project settings.
- **frontend/** — static SPA (`vercel.json` rewrites all routes to `index.html`). Set `VITE_API_BASE_URL` to the deployed backend origin.

## Supabase schema

Apply `backend/db/schema.sql` in the Supabase SQL editor (enables `vector`, creates tables + HNSW index, and the `match_document_chunks` cosine-search RPC).

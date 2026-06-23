# 📋 Software Requirements Specification (SRS)

**Project:** PulseFlow AI — Content-Driven Outreach Automation SaaS
**Status:** Living document. This file is the single source of truth for product
functionality. Every future change to the app MUST be reflected here (see
§13 Change Log).

| Field | Value |
| --- | --- |
| Document version | 1.3.0 |
| Last updated | 2026-06-22 |
| Owner | Product/Eng |
| Source baseline | Original SRS PDF (PulseFlow AI) |

---

## 1. Product Overview & System Architecture

PulseFlow AI is a B2B SaaS platform that lets users upload content assets
(YouTube links, PDFs, blogs), vectorize them, and use automated multi-tool
workflows (via **n8n** and **LangChain**) to fetch leads from **Apollo** and
generate hyper-personalized cold outreach.

```
[React Frontend UI] <---> [Supabase (Auth data, Postgres, pgvector)]
        ^   ^                              ^
        |   | (Webhooks & REST API)        | (Direct query / embeddings)
        v   v                              v
[n8n Automation Engine] <--------> [Node.js / LangChain AI Worker]
 (Apollo, Gmail, HubSpot, Slack)        (Gemini Flash, text chunking)
```

> **Implementation note:** The SRS PDF references a Next.js frontend. Per
> stakeholder decision the frontend is **React (Vite + TypeScript + Tailwind)**.
> All other architecture decisions follow the SRS.

---

## 2. Scope

### In scope
- Semantic knowledge base (RAG) over user content.
- n8n-driven multi-tool campaign orchestration.
- LangChain personalization worker using Gemini 1.5 Flash.
- Analytics dashboard + public landing page.
- JWT-based authentication with separated public/private routes.

### Strict integration policy (v1.1)
- **No optimistic fallbacks.** All external providers (Supabase, HuggingFace,
  Gemini/Groq, Apollo, n8n, Mailtrap/Resend for demo send) are **first-class
  required integrations** for the features that use them. If a provider is not
  configured, the relevant endpoint must **fail fast with a clear error** rather
  than silently degrade.

### Out of scope (for now)
- Production outreach delivery to **lead inboxes** (Gmail/HubSpot/Slack) remains
  in n8n output nodes — the core API does not email Apollo leads directly.
- **Demo/test delivery** to Mailtrap or user-defined test inboxes (Resend) is
  in scope (Module H); it never contacts the sourced lead's address.

---

## 3. Functional Requirements (Features)

### Module A — Semantic Knowledge Base (RAG Engine)
- **System action:** User inputs a URL (blog/YouTube) or uploads/pastes a text
  document.
- **Processing:** The Node.js app grabs the text, chunks it with **LangChain's
  `RecursiveCharacterTextSplitter`**, generates vector embeddings via the
  **HuggingFace Inference API** (`all-MiniLM-L6-v2`, 384 dims), and stores them
  in **Supabase pgvector**.
- **Value:** Builds the "Context Library" used to personalize emails.

### Module B — Multi-Tool Integration Engine (n8n Workspace)
- **System action:** n8n handles tool integration via webhooks (no bespoke
  per-tool integration code in the app).
- **Trigger:** User clicks **"Launch Campaign"** on the frontend → backend calls
  the n8n webhook (`N8N_LAUNCH_WEBHOOK_URL`).
- **Apollo guardrails (backend):** campaigns require at least one targeting
  filter; per-campaign and monthly lead caps are enforced before n8n runs; quota
  surfaced via `GET /api/apollo/quota` and in the Outreach UI.
- **Node 1:** Calls the **Apollo.io** API using the user's targeted filters
  (e.g. "Founders in SaaS, US"); `per_page` follows backend-clamped `filters.limit`.
- **Node 2:** Bulk-ingests leads via `POST /api/worker/leads`, then iterates and
  posts each to the LangChain worker endpoint.
- **Node 3 (output):** Pushes the finalized generated email to Gmail (Drafts),
  HubSpot CRM, or a Slack channel.
- **Local dev:** Docker Compose blueprint at `backend/n8n/docker-compose.example.yml`;
  importable workflow at `backend/n8n/pulseflow-campaign.workflow.json`.

### Module C — LangChain Personalization Worker
- **System action:** Receives a single lead from n8n + a target objective.
- **Step 1:** Queries Supabase via cosine similarity to find the top 2 matching
  content chunks relative to the lead's company/industry.
- **Step 2:** Uses a structured LangChain output prompt (Zod schema parsing) via
  the user's chosen LLM provider — **Gemini 1.5 Flash** (default) or **Groq**
  (`llama-3.3-70b-versatile`) — to extract pain points and generate a custom email.
- **Step 3:** Returns the generated copy to n8n to complete the sequence.
- **Per-user provider:** `app_users.llm_provider` (`gemini` | `groq`); editable
  in Settings → Profile; `PATCH /api/auth/me` with `{ llmProvider }`.

### Module D — Analytics Dashboard & Landing Page
- **Landing page:** modern hero, "How it works" step-by-step layout showcasing
  the integrations (n8n, Apollo, Gmail), and pricing cards; light/dark theme toggle.
- **Dashboard (tabbed navigation):**
  - **Knowledge Base:** list of uploaded files/links (URL, PDF, YouTube transcript)
    with processing status badges; viewport-locked layout with internal scroll.
  - **Outreach Matrix:** live table of Apollo data rows, generation status, Apollo
    quota meter, and preview/send actions for generated emails.
  - **Settings:** top-level tabs — **Profile** (identity, appearance, integration
    status, per-user LLM picker), **Demo email**, **Subscription**, **Security**.

### Module E — Authentication & Access Control (added v1.1)
- **JWT-based auth** (tight + strong): signup, login, logout, token refresh.
- **Public routes:** landing page, auth pages, marketing endpoints.
- **Private routes:** dashboard and all `/api` data endpoints require a valid
  access token; data is scoped to the authenticated `user_id`.
- Passwords hashed (bcrypt); short-lived access token + longer-lived refresh
  token; secret(s) supplied via env.

### Module G — Admin Console (added v1.2)
- **Separate admin identity** (`app_admins` table) and **separate JWT secrets**
  (`JWT_ADMIN_*`). User tokens cannot access admin routes; admin tokens cannot
  access user routes (`typ` claim enforced).
- **Public:** `/admin/login` (frontend), `POST /api/admin/auth/login|refresh`.
- **Private:** `/admin` dashboard and all `/api/admin/*` endpoints.
- **Controls:** platform stats, integration status, list/enable/disable/delete
  users, cross-tenant knowledge & leads moderation, list admins, super_admin can
  create new admins.
- **Bootstrap:** first `super_admin` created on server start from
  `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` when no admins exist.

### Module H — Demo Email Delivery (added v1.3)
- **Purpose:** Safe end-to-end testing of generated outreach without emailing
  Apollo-sourced leads.
- **Modes (per user, `demo_email_target`):**
  - **Mailtrap sandbox** — sends via Mailtrap Email API to the user's Mailtrap inbox.
  - **Real test addresses** — sends via **Resend** to up to **4** user-defined
    test recipients (`user_demo_recipients`).
- **Safety:** subject prefixed `[Demo]`; body includes intended-lead context banner;
  delivery never uses the lead's real inbox.
- **API:** `GET|PATCH /api/demo-email`, CRUD on `/api/demo-email/recipients`,
  `POST /api/leads/:id/send` (requires prior generation).
- **UI:** Settings → **Demo email** tab with toggle switch (Mailtrap ↔ Real);
  recipient table visible only in Real mode; "Send demo email" in email preview modal.
- **Health:** `/api/health` reports `resend` and `mailtrap` configured state.

### Module F — Legacy Template-Library Generator (auxiliary, retained)
- The original demo (sequential lead selection from `leads.json` /
  Apollo CSV + a curated `email-templates.json` library) is retained as an
  **auxiliary capability**, not the primary product flow.
- It remains available behind the authenticated API and reuses the same Gemini
  integration. It must not dictate the primary architecture.

---

## 4. Non-Functional Requirements
- **Security:** JWT auth, hashed passwords, per-user data isolation, secrets only
  in environment variables (never committed).
- **Reliability:** fail-fast on missing/invalid provider configuration with clear
  error messages and status codes.
- **Performance:** stay within free-tier provider limits; avoid serverless
  timeouts by offloading long workflows to n8n / queue where applicable.
- **Portability:** backend and frontend independently deployable (Vercel).

---

## 5. Strict 100% Free Production Tech Stack

| Component | Technology | Free-tier boundary |
| --- | --- | --- |
| Frontend UI | React (Vite) + TypeScript + Tailwind | Vercel free tier |
| Database & Auth data | Supabase (PostgreSQL + pgvector) | 500MB DB, 50k MAU |
| Workflow engine | n8n Community Edition | Self-hosted (Render/Hetzner/Oracle free) |
| LLM | Google Gemini 1.5 Flash **or** Groq Llama 3.3 70B via LangChain | Gemini: 15 RPM / 1M TPM; Groq free tier |
| Demo email | Mailtrap (sandbox) + Resend (test inboxes) | Mailtrap free sandbox; Resend free tier |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` | HF serverless inference |
| Queue (optional) | Upstash / Inngest | Upstash 10k req/day |

---

## 6. Database Schema (Supabase PostgreSQL)

- **app_users** (custom JWT auth identity)
  - `id uuid PK`, `email varchar unique`, `password_hash text`,
    `full_name varchar`, `is_active boolean`, `llm_provider varchar` (`gemini`|`groq`),
    `demo_email_target varchar` (`mailtrap`|`real`), `created_at timestamptz`
- **user_demo_recipients** (demo send targets, max 4 per user)
  - `id uuid PK`, `user_id uuid FK`, `first_name`, `last_name`, `email`,
    `created_at timestamptz`, unique `(user_id, email)`
- **app_admins** (admin JWT auth identity)
  - `id uuid PK`, `email varchar unique`, `password_hash text`,
    `full_name varchar`, `role varchar ('admin'|'super_admin')`,
    `is_active boolean`, `created_at timestamptz`
- **knowledge_base**
  - `id uuid PK`, `user_id uuid FK`, `source_url text`, `source_type varchar`,
    `title varchar`, `status varchar`, `created_at timestamptz`
- **document_chunks**
  - `id uuid PK`, `kb_id uuid FK (cascade delete)`, `content text`,
    `embedding vector(384)` (HNSW index), `created_at timestamptz`
- **leads_campaign**
  - `id uuid PK`, `user_id uuid FK`, `first_name`, `last_name`, `email`,
    `company_name`, `job_title`, `industry`, `generated_subject text`,
    `generated_email text`, `status varchar ('pending'|'processing'|'completed'|'failed')`,
    `created_at timestamptz`

RPC: `match_document_chunks(query_embedding, match_count, p_user_id)` — cosine
similarity search.

---

## 7. API Contract (current target)

Auth (public):
- `POST /api/auth/signup` — { email, password, fullName } → { user, accessToken, refreshToken }
- `POST /api/auth/login` — { email, password } → { user, accessToken, refreshToken }
- `POST /api/auth/refresh` — { refreshToken } → { accessToken }
- `POST /api/auth/logout`
- `GET  /api/auth/me` (private) → current user
- `PATCH /api/auth/me` (private) — `{ fullName?, llmProvider? }` → updated user

Demo email (private):
- `GET|PATCH /api/demo-email` — settings (`target`: `mailtrap`|`real`)
- `POST /api/demo-email/recipients` · `PATCH|DELETE /api/demo-email/recipients/:id`

Knowledge base (private):
- `GET /api/knowledge`, `POST /api/knowledge`, `POST /api/knowledge/stream`,
  `DELETE /api/knowledge/:id`

Campaigns / Outreach (private):
- `GET /api/leads`, `GET /api/leads/:id`, `GET /api/apollo/quota`
- `POST /api/campaigns` (launch → n8n → Apollo)
- `POST /api/leads/:id/generate`, `POST /api/leads/generate-all`
- `POST /api/leads/:id/send` (demo delivery — Module H)
- `DELETE /api/leads`

System:
- `GET /api/health`, `GET /api/stats` (private)

Worker (called by n8n, `x-worker-secret`):
- `POST /api/worker/leads` — bulk ingest Apollo results
- `POST /api/worker/generate-outreach` — RAG + LLM generation per lead

Legacy (private, auxiliary): `/generate-email`, `/generate-email-from-apollo`.

Admin auth (public login/refresh; private otherwise):
- `POST /api/admin/auth/login` · `/refresh` · `/logout`
- `GET /api/admin/auth/me`
- `POST /api/admin/auth/admins` (super_admin only)

Admin controls (admin JWT):
- `GET /api/admin/stats` · `/integrations`
- `GET|PATCH|DELETE /api/admin/users` (+ `GET /:id`)
- `GET|DELETE /api/admin/knowledge`
- `GET|DELETE /api/admin/leads`
- `GET /api/admin/admins`

Frontend routes:
- Public: `/`, `/login`, `/signup`, `/admin/login`
- User private: `/dashboard`
- Admin private: `/admin`

---

## 8. Authentication Design (JWT)

### User JWT
- Access token: short TTL (e.g. 15m), signed with `JWT_ACCESS_SECRET`, claim `typ: "user"`.
- Refresh token: longer TTL (e.g. 7d), signed with `JWT_REFRESH_SECRET`.
- `Authorization: Bearer <accessToken>` on private user requests.

### Admin JWT (separate)
- Access/refresh signed with `JWT_ADMIN_ACCESS_SECRET` / `JWT_ADMIN_REFRESH_SECRET`.
- Claim `typ: "admin"`; includes `role` (`admin` | `super_admin`).
- Must use **different secrets** from user JWT to prevent cross-use.

---

## 9. Integration Requirements (all REQUIRED — no fallbacks)
- **Supabase:** primary datastore + pgvector + auth identity table.
- **HuggingFace:** embeddings (`all-MiniLM-L6-v2`).
- **Gemini and/or Groq via LangChain:** structured email generation (at least one
  provider must be configured; users pick per-account in Profile).
- **Apollo:** lead sourcing (through n8n); backend enforces free-tier quotas.
- **n8n:** campaign orchestration spine; backend triggers webhook, worker
  endpoints receive lead ingest + generation callbacks.
- **Mailtrap** (demo mode `mailtrap`) and/or **Resend** (demo mode `real`):
  required for the active demo-email target; fail-fast if missing when sending.

---

## 10. Environment Variables

### backend/.env
```
PORT=
CORS_ORIGINS=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ADMIN_ACCESS_SECRET=
JWT_ADMIN_REFRESH_SECRET=
WORKER_SHARED_SECRET=
ADMIN_BOOTSTRAP_EMAIL=
ADMIN_BOOTSTRAP_PASSWORD=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
LLM_PROVIDER=gemini          # gemini | groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
HUGGINGFACE_API_KEY=
HUGGINGFACE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
APOLLO_API_KEY=
APOLLO_DEFAULT_LEADS_PER_CAMPAIGN=5
APOLLO_MAX_LEADS_PER_CAMPAIGN=10
APOLLO_MAX_LEADS_PER_USER_MONTH=25
APOLLO_MAX_LEADS_PER_MONTH=50
N8N_LAUNCH_WEBHOOK_URL=
MAILTRAP_API_TOKEN=
MAILTRAP_FROM_EMAIL=
MAILTRAP_FROM_NAME=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=
```

### frontend/.env
```
VITE_API_BASE_URL=
```

---

## 11. Execution Strategy
1. **Auth + private shell:** JWT auth, route guards, separate public/private.
2. **Supabase as the only store:** remove in-memory fallback.
3. **LangChain + HuggingFace + Gemini:** real RAG worker.
4. **n8n + Apollo:** webhook trigger + worker callback + n8n workflow blueprint.
5. **Dashboard polish:** statuses, previews, analytics.

---

## 12. Open Questions / Pending Decisions
- Auth identity store: custom `app_users` table vs Supabase Auth (GoTrue) — **using
  custom `app_users`** (resolved v1.1).
- n8n hosting + webhook URL provisioning — **workflow JSON + Docker example
  shipped** (`backend/n8n/`); production URL per deployment (resolved v1.3).
- Campaign-scoped knowledge (RAG limited to selected KB items per campaign) —
  not yet implemented.
(Track resolutions in §13.)

---

## 13. Change Log / Amendments

### v1.3.0 — 2026-06-22
- Added **Module H (Demo Email Delivery)** — Mailtrap sandbox vs Resend test
  inboxes; never emails Apollo lead addresses; `[Demo]` subject prefix and lead
  context banner on all sends.
- **Schema:** `app_users.demo_email_target`, `user_demo_recipients` (max 4 per
  user); migration `004_demo_email.sql`.
- **Demo email API:** `GET|PATCH /api/demo-email`, recipient CRUD,
  `POST /api/leads/:id/send`; health reports `resend` / `mailtrap` status.
- **Settings UI:** Demo email as top-level tab (Profile · Demo email ·
  Subscription · Security); toggle switch Mailtrap ↔ Real; recipients UI only in
  Real mode; integration status + LLM picker in Profile.
- **Per-user LLM provider:** `app_users.llm_provider` (`gemini`|`groq`);
  `PATCH /api/auth/me`; Groq via `@langchain/groq` (`llama-3.3-70b-versatile`);
  migration `003_user_llm_provider.sql`.
- **Apollo free-tier guardrails:** require ≥1 targeting filter; per-campaign and
  monthly caps (`APOLLO_*` env vars); `GET /api/apollo/quota`; quota meter in
  Outreach; worker ingest trims to remaining quota.
- **n8n:** importable `pulseflow-campaign.workflow.json`; Docker Compose example;
  `POST /api/worker/leads` bulk ingest; `WORKER_SHARED_SECRET` header auth;
  backend-clamped `filters.limit` passed to Apollo `per_page`.
- **Knowledge ingest:** YouTube transcript support (`youtube-transcript-plus`);
  `POST /api/knowledge/stream` for streaming ingest progress.
- **UI polish:** light/dark theme toggle; viewport-locked Knowledge Base scroll;
  email preview modal with "Send demo email"; Outreach generate-all and status badges.

### v1.2.0 — 2026-06-21
- Added **Module G (Admin Console)** with separate `app_admins` table, admin JWT
  auth, `/api/admin/*` routes, and frontend `/admin` area.
- Added `is_active` on `app_users` for admin enable/disable control.

### v1.1.0 — 2026-06-21
- Added **Module E (JWT Authentication)** and `app_users` schema.
- Marked the original template-library email generator as **Module F
  (auxiliary)** rather than the primary product.
- Declared **strict no-fallback integration policy** (Supabase, HuggingFace,
  Gemini/LangChain, Apollo, n8n all required).
- Recorded frontend = React (not Next.js) decision.

### v1.0.0 — baseline
- Initial SRS imported from source PDF (Modules A–D, schema, tech stack).

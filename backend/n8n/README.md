# n8n Campaign Workflow (PulseFlow AI — Module B)

This folder contains the importable n8n workflow that orchestrates a campaign:

```
Webhook (Launch) → Apollo People Search → Map leads → Generate Outreach (worker) → [Gmail/HubSpot/Slack]
```

## Local Docker (Windows)

Use `backend/n8n/docker-compose.example.yml` as a template. Critical settings:

| n8n env | Value |
| --- | --- |
| `WORKER_URL` | `http://host.docker.internal:3000` (backend on host, port 3000) |
| `WORKER_SHARED_SECRET` | Same as `WORKER_SHARED_SECRET` in `backend/.env` |
| `APOLLO_API_KEY` | Same Apollo key as backend (or only in n8n — backend checks its own copy) |

In `backend/.env`:

```env
N8N_LAUNCH_WEBHOOK_URL=http://localhost:5678/webhook/pulseflow-launch
WORKER_SHARED_SECRET=pulseflow_dev_secret_123
```

### Activate the workflow (required — fixes webhook 404)

A **404** from the backend means the production webhook is not registered. n8n only registers it when the workflow is **Active**.

1. Open **http://localhost:5678**
2. **Workflows** → **Import from File** → `backend/n8n/pulseflow-campaign.workflow.json` (re-import after updates)
3. Open **PulseFlow AI - Launch Campaign**
4. Toggle **Active** ON (top-right of the editor)
5. Confirm production URL: `http://localhost:5678/webhook/pulseflow-launch`

### Docker `WORKER_URL` (fixes stuck “Search Apollo” / no leads)

On **Docker Desktop for Windows**, the backend on your host must be:

```yaml
WORKER_URL=http://host.docker.internal:3000   # port 3000 = Express backend
extra_hosts:
  - "host.docker.internal:host-gateway"
```

`http://docker.internal` **does not resolve** — the worker step fails silently and **no leads appear** in the dashboard.

After editing `docker-compose.yml`:

```bash
docker compose -f c:/pulseflow-n8n/docker-compose.yml down
docker compose -f c:/pulseflow-n8n/docker-compose.yml up -d
```

### Apollo API plan (required for campaigns)

People Search (`/api/v1/mixed_people/api_search`) and enrichment (`/api/v1/people/match`) are **not available on Apollo’s free plan**. The API key can be valid while search returns HTTP 403.

1. Upgrade at [Apollo plans](https://app.apollo.io/#/settings/plans/upgrade) (Basic or higher).
2. Create a **master API key** in Apollo → Settings → Integrations → API.
3. Put the same key in `backend/.env` (`APOLLO_API_KEY`) and n8n Docker env.
4. Re-import `pulseflow-campaign.workflow.json` and toggle **Active**.

`GET /api/health` reports `configured.apolloApi.accessible`.

Verify from the repo root:

```bash
npm run check:n8n --workspace backend
```

You should see `✓ Webhook is live`. Then retry **Launch campaign** in the dashboard.

**Fix:** `WORKER_URL=http://docker.internal` does not resolve on Docker Desktop — use `host.docker.internal`.

## Setup

1. **Self-host n8n** (Community Edition) — e.g. on Render, Hetzner, or Oracle free tier,
   or run locally: `npx n8n` (or Docker `docker run -it --rm -p 5678:5678 n8nio/n8n`).
2. In n8n, set these **environment variables** (Settings → Variables or host env):
   - `APOLLO_API_KEY` — your Apollo.io API key
   - `WORKER_URL` — your deployed backend origin (e.g. `https://your-backend.vercel.app`)
   - `WORKER_SHARED_SECRET` — must equal the backend's `WORKER_SHARED_SECRET`
3. **Import** `pulseflow-campaign.workflow.json` (Workflows → Import from File).
4. **Activate** the workflow and copy the **Production Webhook URL** of the
   "Launch Campaign Webhook" node.
5. Put that URL in the backend env as `N8N_LAUNCH_WEBHOOK_URL`.
6. (Optional) Add a Gmail "Create Draft", HubSpot, or Slack node after
   "Generate Outreach" to deliver the result (see the sticky note in the workflow).

## Credit-conscious defaults (free tier)

Apollo charges credits per search (`per_page` results). PulseFlow enforces tight limits in the **backend** before n8n runs:

| Env var | Default | Purpose |
| --- | --- | --- |
| `APOLLO_DEFAULT_LEADS_PER_CAMPAIGN` | 1 | UI default batch size |
| `APOLLO_MAX_LEADS_PER_CAMPAIGN` | 10 | Hard cap per launch |
| `APOLLO_MAX_LEADS_PER_USER_MONTH` | 25 | Per-user monthly leads stored |
| `APOLLO_MAX_LEADS_PER_MONTH` | 50 | Global monthly cap (shared API key) |

**Tips:** Always set at least one filter (title, industry, or location). Use small batches during testing. Re-import this workflow after updates so `per_page` follows the backend-clamped `filters.limit`.

## Contract

- **Backend → n8n** (`POST` to the webhook):
  ```json
  { "event": "launch_campaign", "userId": "<uuid>", "objective": "...", "filters": { "jobTitle": "...", "industry": "...", "location": "...", "limit": 25 } }
  ```
- **n8n → backend** (per lead, `POST {WORKER_URL}/api/worker/generate-outreach`,
  header `x-worker-secret`):
  ```json
  { "userId": "<uuid>", "objective": "...", "lead": { "first_name": "...", "last_name": "...", "email": "...", "company_name": "...", "job_title": "...", "industry": "..." } }
  ```
  Response includes `email.subject` / `email.body` for the output node.

// API base: empty string uses the Vite dev proxy (/api -> backend).
// In production set VITE_API_BASE_URL to your deployed backend origin.
const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const ACCESS_KEY = "pf_access_token";
const REFRESH_KEY = "pf_refresh_token";

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type LeadStatus = "pending" | "processing" | "completed" | "failed";
export type KbStatus = "processing" | "ready" | "failed";

export type IngestStreamStepId = "fetch" | "chunk" | "embed" | "store" | "finalize";

export type IngestStreamEvent =
  | { type: "step"; step: IngestStreamStepId; status: "running" | "done" | "failed"; detail?: Record<string, unknown> }
  | { type: "complete"; item: KnowledgeItem }
  | { type: "error"; message: string; code?: string; status?: number };

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  llmProvider?: "gemini" | "groq";
  createdAt: string | null;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  source_url: string | null;
  source_type: string;
  status: KbStatus;
  created_at: string;
  chunk_count: number;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  job_title: string;
  industry: string;
  generated_subject: string | null;
  generated_email: string | null;
  status: LeadStatus;
  created_at: string;
}

export interface Stats {
  knowledgeCount: number;
  chunkCount: number;
  leadCount: number;
  leadsByStatus: Record<string, number>;
}

export interface ApolloLimits {
  maxPerCampaign: number;
  defaultPerCampaign: number;
  maxPerMonth: number;
  maxPerUserMonth: number;
}

export interface ApolloUsage {
  monthStart: string;
  userUsed: number;
  globalUsed: number;
  userRemaining: number;
  globalRemaining: number;
  limits: ApolloLimits;
}

export type DemoEmailTarget = "mailtrap" | "real";

export interface DemoEmailRecipient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string | null;
}

export interface EmailDeliveryResult {
  channel: DemoEmailTarget;
  provider: string;
  stubbed?: boolean;
  deliveredTo: string[];
  intendedLead: string;
  note?: string;
}

export interface HealthConfigured {
  auth: boolean;
  adminAuth: boolean;
  supabase: boolean;
  embeddings: boolean;
  llm: boolean;
  llmProvider?: "gemini" | "groq";
  llmModel?: string;
  llmProviders?: {
    gemini: { configured: boolean; model: string };
    groq: { configured: boolean; model: string };
  };
  apollo: boolean;
  apolloApi?: {
    configured: boolean;
    accessible: boolean;
    status?: number;
    message?: string;
    upgradeUrl?: string;
  };
  apolloEnrichment?: {
    configured: boolean;
    accessible: boolean;
    status?: number;
    message?: string;
  };
  hunter?: boolean;
  hunterApi?: {
    configured: boolean;
    accessible: boolean;
    status?: number;
    message?: string;
    plan?: string | null;
    searchesRemaining?: number | null;
  };
  apolloLimits?: ApolloLimits;
  resend?: boolean;
  mailtrap?: boolean;
  n8n: boolean;
  n8nWebhook?: {
    configured: boolean;
    live: boolean;
    url: string | null;
    status: number | null;
  };
  worker: boolean;
}

function shouldRetryWithRefresh(path: string): boolean {
  // Allow refresh for authenticated profile routes; never for login/signup/refresh.
  if (path === "/api/auth/me") return true;
  if (path.startsWith("/api/auth") || path.startsWith("/api/admin/auth")) return false;
  return true;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.accessToken) return false;
    tokenStore.set(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const access = tokenStore.access;
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry && tokenStore.refresh && shouldRetryWithRefresh(path)) {
    const ok = await refreshAccessToken();
    if (ok) return request<T>(path, options, false);
    tokenStore.clear();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as { ok?: boolean })?.ok === false) {
    const d = data as { error?: string; code?: string };
    throw new ApiError(d?.error || `Request failed (${res.status})`, res.status, d?.code);
  }
  return data as T;
}

async function ingestKnowledgeStream(
  payload: { title?: string; sourceUrl?: string; text?: string },
  onEvent: (event: IngestStreamEvent) => void
): Promise<KnowledgeItem> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const access = tokenStore.access;
  if (access) headers.set("Authorization", `Bearer ${access}`);

  let res = await fetch(`${BASE}/api/knowledge/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (res.status === 401 && tokenStore.refresh) {
    const ok = await refreshAccessToken();
    if (ok) {
      headers.set("Authorization", `Bearer ${tokenStore.access}`);
      res = await fetch(`${BASE}/api/knowledge/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } else {
      tokenStore.clear();
    }
  }

  if (!res.ok && !res.body) {
    const data = await res.json().catch(() => ({}));
    const d = data as { error?: string; code?: string };
    throw new ApiError(d?.error || `Request failed (${res.status})`, res.status, d?.code);
  }

  if (!res.body) {
    throw new ApiError("No response stream from ingest endpoint", res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let item: KnowledgeItem | null = null;
  let streamError: ApiError | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as IngestStreamEvent;
      onEvent(event);
      if (event.type === "complete") item = event.item;
      if (event.type === "error") {
        streamError = new ApiError(event.message, event.status || 500, event.code);
      }
    }
  }

  if (streamError) throw streamError;
  if (!item) throw new ApiError("Ingest finished without a result", 500);
  return item;
}

export const api = {
  // Auth
  signup: (payload: { email: string; password: string; fullName?: string }) =>
    request<{ ok: true; user: User; accessToken: string; refreshToken: string }>(
      "/api/auth/signup",
      { method: "POST", body: JSON.stringify(payload) }
    ),
  login: (payload: { email: string; password: string }) =>
    request<{ ok: true; user: User; accessToken: string; refreshToken: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(payload) }
    ),
  me: () => request<{ ok: true; user: User }>("/api/auth/me"),
  updateProfile: (payload: { fullName?: string; llmProvider?: "gemini" | "groq" }) =>
    request<{ ok: true; user: User }>("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  // System
  health: () => request<{ ok: true; configured: HealthConfigured }>("/api/health"),
  stats: () => request<{ ok: true; stats: Stats }>("/api/stats"),

  // Knowledge base
  listKnowledge: () => request<{ ok: true; items: KnowledgeItem[] }>("/api/knowledge"),
  addKnowledge: (payload: { title?: string; sourceUrl?: string; text?: string }) =>
    request<{ ok: true; item: KnowledgeItem }>("/api/knowledge", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addKnowledgeStream: ingestKnowledgeStream,
  deleteKnowledge: (id: string) =>
    request<{ ok: true }>(`/api/knowledge/${id}`, { method: "DELETE" }),

  // Campaigns & leads
  apolloQuota: () => request<{ ok: true; apollo: ApolloUsage }>("/api/apollo/quota"),
  listLeads: () => request<{ ok: true; leads: Lead[] }>("/api/leads"),
  launchCampaign: (payload: {
    domain?: string;
    inboundEmail?: string;
    jobTitle?: string;
    industry?: string;
    location?: string;
    keyword?: string;
    limit?: number;
    objective?: string;
    tone?: string;
    prospectProvider?: "apollo" | "hunter";
  }) =>
    request<{
      ok: true;
      launched: boolean;
      mode?: "inbound_enrichment" | "prospecting" | "hunter_prospecting";
      lead?: Lead;
      leads?: Lead[];
      enrichment?: {
        name: string;
        domain?: string;
        industry?: string;
        employees?: number | null;
        description?: string;
      };
      apollo?: {
        requestedLimit?: number | null;
        appliedLimit: number;
        usage: Pick<ApolloUsage, "userUsed" | "globalUsed" | "userRemaining" | "globalRemaining" | "limits">;
      };
    }>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  generateLead: (id: string, objective?: string, tone?: string) =>
    request<{ ok: true; lead: Lead }>(`/api/leads/${id}/generate`, {
      method: "POST",
      body: JSON.stringify({ objective, tone }),
    }),
  generateAll: (objective?: string, tone?: string) =>
    request<{ ok: true; processed: number }>("/api/leads/generate-all", {
      method: "POST",
      body: JSON.stringify({ objective, tone }),
    }),
  clearLeads: () => request<{ ok: true }>("/api/leads", { method: "DELETE" }),

  // Demo email (Mailtrap / Resend)
  getDemoEmail: () =>
    request<{
      ok: true;
      target: DemoEmailTarget;
      recipients: DemoEmailRecipient[];
      maxRecipients: number;
    }>("/api/demo-email"),
  updateDemoEmailTarget: (target: DemoEmailTarget) =>
    request<{
      ok: true;
      target: DemoEmailTarget;
      recipients: DemoEmailRecipient[];
      maxRecipients: number;
    }>("/api/demo-email", { method: "PATCH", body: JSON.stringify({ target }) }),
  addDemoRecipient: (payload: { firstName?: string; lastName?: string; email: string }) =>
    request<{ ok: true; recipient: DemoEmailRecipient }>("/api/demo-email/recipients", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteDemoRecipient: (id: string) =>
    request<{ ok: true }>(`/api/demo-email/recipients/${id}`, { method: "DELETE" }),
  sendLeadEmail: (id: string) =>
    request<{ ok: true; delivery: EmailDeliveryResult }>(`/api/leads/${id}/send`, {
      method: "POST",
    }),
};

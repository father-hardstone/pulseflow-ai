const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const ACCESS_KEY = "pf_admin_access_token";
const REFRESH_KEY = "pf_admin_refresh_token";

export const adminTokenStore = {
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

export class AdminApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface Admin {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "super_admin";
  createdAt: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  llm_provider?: string;
  created_at: string;
  stats?: {
    knowledgeCount: number;
    leadCount: number;
    outreachRuns: number;
    leadsCompleted: number;
    leadsFailed: number;
    leadsPending: number;
  };
}

export interface AdminKnowledgeItem {
  id: string;
  title: string;
  source_url: string | null;
  source_type: string;
  status: string;
  created_at: string;
  chunk_count: number;
  owner_email: string | null;
  owner_name: string | null;
}

export interface AdminLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  job_title: string;
  status: string;
  created_at: string;
  owner_email: string | null;
  owner_name: string | null;
}

export interface PlatformStats {
  userCount: number;
  activeUserCount: number;
  inactiveUserCount: number;
  newUsersThisMonth: number;
  usersWithOutreach: number;
  usersWithKnowledge: number;
  adminCount: number;
  knowledgeCount: number;
  chunkCount: number;
  leadCount: number;
  outreachRuns: number;
  leadsCompleted: number;
  leadsFailed: number;
  leadsPending: number;
  leadsByStatus: Record<string, number>;
}

async function refreshAdminToken(): Promise<boolean> {
  const refresh = adminTokenStore.refresh;
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE}/api/admin/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.accessToken) return false;
    adminTokenStore.set(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

async function adminRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const access = adminTokenStore.access;
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (
    res.status === 401 &&
    retry &&
    adminTokenStore.refresh &&
    !path.startsWith("/api/admin/auth/login")
  ) {
    const ok = await refreshAdminToken();
    if (ok) return adminRequest<T>(path, options, false);
    adminTokenStore.clear();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as { ok?: boolean })?.ok === false) {
    const d = data as { error?: string; code?: string };
    throw new AdminApiError(d?.error || `Request failed (${res.status})`, res.status, d?.code);
  }
  return data as T;
}

export const adminApi = {
  login: (payload: { email: string; password: string }) =>
    adminRequest<{ ok: true; admin: Admin; accessToken: string; refreshToken: string }>(
      "/api/admin/auth/login",
      { method: "POST", body: JSON.stringify(payload) }
    ),
  me: () => adminRequest<{ ok: true; admin: Admin }>("/api/admin/auth/me"),
  updateProfile: (payload: { fullName?: string }) =>
    adminRequest<{ ok: true; admin: Admin }>("/api/admin/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    adminRequest<{ ok: true }>("/api/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () => adminRequest<{ ok: true }>("/api/admin/auth/logout", { method: "POST" }),
  createAdmin: (payload: {
    email: string;
    password: string;
    fullName?: string;
    role?: string;
  }) =>
    adminRequest<{ ok: true; admin: Admin }>("/api/admin/auth/admins", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  stats: () => adminRequest<{ ok: true; stats: PlatformStats }>("/api/admin/stats"),
  integrations: () =>
    adminRequest<{ ok: true; configured: Record<string, boolean> }>("/api/admin/integrations"),

  listUsers: () => adminRequest<{ ok: true; users: AdminUser[] }>("/api/admin/users"),
  getUser: (id: string) => adminRequest<{ ok: true; user: AdminUser }>(`/api/admin/users/${id}`),
  setUserActive: (id: string, isActive: boolean) =>
    adminRequest<{ ok: true; user: AdminUser }>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),
  deleteUser: (id: string) =>
    adminRequest<{ ok: true; id: string }>(`/api/admin/users/${id}`, { method: "DELETE" }),

  listKnowledge: () =>
    adminRequest<{ ok: true; items: AdminKnowledgeItem[] }>("/api/admin/knowledge"),
  deleteKnowledge: (id: string) =>
    adminRequest<{ ok: true; id: string }>(`/api/admin/knowledge/${id}`, { method: "DELETE" }),

  listLeads: () => adminRequest<{ ok: true; leads: AdminLead[] }>("/api/admin/leads"),
  deleteLead: (id: string) =>
    adminRequest<{ ok: true; id: string }>(`/api/admin/leads/${id}`, { method: "DELETE" }),

  listAdmins: () => adminRequest<{ ok: true; admins: Admin[] }>("/api/admin/admins"),
};

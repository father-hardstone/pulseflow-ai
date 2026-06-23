import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { adminApi, adminTokenStore, type Admin } from "../lib/adminApi";

interface AdminAuthState {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setAdmin: (admin: Admin | null) => void;
}

const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!adminTokenStore.access) {
        setLoading(false);
        return;
      }
      try {
        const res = await adminApi.me();
        if (active) setAdmin(res.admin);
      } catch {
        adminTokenStore.clear();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const res = await adminApi.login({ email, password });
    adminTokenStore.set(res.accessToken, res.refreshToken);
    setAdmin(res.admin);
  }

  function logout() {
    adminApi.logout().catch(() => {});
    adminTokenStore.clear();
    setAdmin(null);
  }

  const value = useMemo(
    () => ({ admin, loading, login, logout, setAdmin }),
    [admin, loading]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

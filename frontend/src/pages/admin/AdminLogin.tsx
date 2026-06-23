import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";
import Logo from "../../components/Logo";
import ThemeToggle from "../../components/ThemeToggle";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { AdminApiError } from "../../lib/adminApi";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err instanceof AdminApiError && err.code === "NOT_CONFIGURED"
          ? "Admin auth isn't configured (set JWT_ADMIN_* secrets + Supabase)."
          : (err as Error).message;
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-5">
      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-8rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-rose-600/20 blur-[120px]" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card border-rose-500/20 p-8">
          <div className="mb-4 flex items-center gap-2 text-rose-500 dark:text-rose-300">
            <Shield className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Admin access</span>
          </div>
          <h1 className="text-xl font-bold text-fg">Sign in to admin</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Platform controls — separate from user accounts.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Admin email</label>
              <input
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button type="submit" className="btn-primary w-full bg-rose-600 hover:bg-rose-500" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Admin login
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/" className="hover:text-slate-300">
              ← Back to site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

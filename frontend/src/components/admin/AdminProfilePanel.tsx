import { useState, useEffect } from "react";
import { Calendar, Check, Loader2, Lock, Shield, User } from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { formatAdminDate } from "./adminUi";

export default function AdminProfilePanel() {
  const { admin, setAdmin } = useAdminAuth();
  const [fullName, setFullName] = useState(admin?.fullName ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  useEffect(() => {
    setFullName(admin?.fullName ?? "");
  }, [admin?.fullName]);

  if (!admin) return null;

  const initial = (admin.fullName?.[0] ?? admin.email[0] ?? "A").toUpperCase();

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    setProfileErr("");
    try {
      const res = await adminApi.updateProfile({ fullName });
      setAdmin(res.admin);
      setProfileMsg("Profile updated.");
    } catch (err) {
      setProfileErr((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg("");
    setPwErr("");
    if (newPassword !== confirmPassword) {
      setPwErr("Passwords don't match.");
      return;
    }
    setSavingPw(true);
    try {
      await adminApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwMsg("Password updated.");
    } catch (err) {
      setPwErr((err as Error).message);
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-5">
      <div className="card p-6 lg:col-span-2">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-5">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-2xl font-bold text-white shadow-lg shadow-rose-900/30">
            {initial}
          </span>
          <div className="mt-4 sm:mt-0">
            <h3 className="text-lg font-semibold text-fg">{admin.fullName || "Admin"}</h3>
            <p className="text-sm text-fg-muted">{admin.email}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300">
              <Shield className="h-3.5 w-3.5" />
              {admin.role === "super_admin" ? "Super admin" : "Admin"}
            </span>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-fg-muted sm:justify-start">
              <Calendar className="h-3.5 w-3.5" />
              Since {formatAdminDate(admin.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={saveProfile} className="card p-6 lg:col-span-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-rose-400" />
          <h3 className="font-semibold text-fg">Profile details</h3>
        </div>
        <p className="mt-1 text-xs text-fg-muted">How your name appears in the admin console.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Display name</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Admin name"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input opacity-70" value={admin.email} disabled />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary bg-rose-600 hover:bg-rose-500" disabled={savingProfile}>
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save profile
          </button>
          {profileMsg && <span className="text-sm text-emerald-400">{profileMsg}</span>}
          {profileErr && <span className="text-sm text-rose-400">{profileErr}</span>}
        </div>
      </form>

      <form onSubmit={savePassword} className="card p-6 lg:col-span-5">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-rose-400" />
          <h3 className="font-semibold text-fg">Change password</h3>
        </div>
        <p className="mt-1 text-xs text-fg-muted">Minimum 10 characters.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Current password</label>
            <input
              className="input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Confirm</label>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-ghost border border-surface-line" disabled={savingPw}>
            {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Update password
          </button>
          {pwMsg && <span className="text-sm text-emerald-400">{pwMsg}</span>}
          {pwErr && <span className="text-sm text-rose-400">{pwErr}</span>}
        </div>
      </form>
    </div>
  );
}

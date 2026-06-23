import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, LogOut, Settings } from "lucide-react";

export type DashboardTab = "overview" | "knowledge" | "outreach" | "settings";

export interface DashboardNavItem {
  id: DashboardTab;
  label: string;
  icon: LucideIcon;
  hint?: string;
}

interface DashboardSidebarProps {
  items: DashboardNavItem[];
  active: DashboardTab;
  onSelect: (tab: DashboardTab) => void;
  userEmail?: string;
  onLogout: () => void;
}

function userInitial(email: string) {
  return (email.trim()[0] ?? "?").toUpperCase();
}

export default function DashboardSidebar({
  items,
  active,
  onSelect,
  userEmail,
  onLogout,
}: DashboardSidebarProps) {
  return (
    <aside
      className="peer/sidebar group/sidebar fixed inset-y-0 left-0 z-40 flex w-[4.5rem] flex-col border-r border-surface-line bg-ink-800/95 backdrop-blur-xl transition-[width] duration-300 ease-out hover:w-60"
      aria-label="Dashboard navigation"
    >
      {/* Brand */}
      <div className="flex h-[4.25rem] shrink-0 items-center border-b border-surface-line px-3">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-3 overflow-hidden">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden>
              <path
                d="M5 17h5l2-6 4 12 3-9 2 3h6"
                fill="none"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="min-w-0 truncate text-base font-bold tracking-tight text-fg opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            Pulse<span className="text-brand-400">Flow</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
          Workspace
        </p>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              title={item.label}
              className={`relative flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? "bg-brand-600/20 text-fg"
                  : "text-fg-muted hover:bg-surface-overlay hover:text-fg"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-400" />
              )}
              <Icon
                className={`h-5 w-5 shrink-0 ${isActive ? "text-brand-300" : "text-fg-muted"}`}
              />
              <span className="ml-3 min-w-0 flex-1 overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                <span className="block truncate text-sm font-medium">{item.label}</span>
                {item.hint && (
                  <span className="block truncate text-xs text-fg-muted">{item.hint}</span>
                )}
              </span>
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="shrink-0 border-t border-surface-line p-2">
        {userEmail && (
          <button
            type="button"
            onClick={() => onSelect("settings")}
            title="Account settings"
            className={`group/profile mb-1 flex w-full items-center gap-3 overflow-hidden rounded-xl px-2 py-2 text-left transition-colors ${
              active === "settings"
                ? "bg-brand-600/20"
                : "hover:bg-surface-overlay"
            }`}
          >
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-200">
              {userInitial(userEmail)}
              <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border border-ink-800 bg-ink-700 text-fg-muted">
                <Settings className="h-2.5 w-2.5" />
              </span>
            </span>
            <div className="min-w-0 flex-1 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
              <p className="truncate text-xs text-fg-muted">Account</p>
              <p className="truncate text-sm font-medium text-fg-body">{userEmail}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100" />
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center rounded-xl px-3 py-2.5 text-fg-muted transition-colors hover:bg-surface-overlay hover:text-fg"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="ml-3 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            Log out
          </span>
        </button>
      </div>
    </aside>
  );
}

import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, LogOut, Menu, Settings, X } from "lucide-react";
import { forwardRef, useCallback, useEffect, useRef, type RefObject } from "react";

export type DashboardTab = "overview" | "knowledge" | "outreach" | "settings";

export interface DashboardNavItem {
  id: DashboardTab;
  label: string;
  icon: LucideIcon;
  hint?: string;
  /** Shorter label for the mobile bottom bar */
  shortLabel?: string;
}

interface DashboardSidebarProps {
  items: DashboardNavItem[];
  active: DashboardTab;
  onSelect: (tab: DashboardTab) => void;
  userEmail?: string;
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  returnFocusRef?: RefObject<HTMLButtonElement>;
}

function userInitial(email: string) {
  return (email.trim()[0] ?? "?").toUpperCase();
}

function NavButton({
  item,
  isActive,
  onClick,
  compact = false,
}: {
  item: DashboardNavItem;
  isActive: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
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
      <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-brand-300" : "text-fg-muted"}`} />
      <span
        className={`ml-3 min-w-0 flex-1 overflow-hidden ${
          compact ? "opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100" : ""
        }`}
      >
        <span className="block truncate text-sm font-medium">{item.label}</span>
        {item.hint && (
          <span className="block truncate text-xs text-fg-muted">{item.hint}</span>
        )}
      </span>
    </button>
  );
}

function BrandMark({ showWordmark = false }: { showWordmark?: boolean }) {
  return (
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
      {showWordmark && (
        <span className="min-w-0 truncate text-base font-bold tracking-tight text-fg">
          Pulse<span className="text-brand-400">Flow</span>
        </span>
      )}
    </Link>
  );
}

export default function DashboardSidebar({
  items,
  active,
  onSelect,
  userEmail,
  onLogout,
  mobileOpen,
  onMobileOpenChange,
  returnFocusRef,
}: DashboardSidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobile = useCallback(() => {
    onMobileOpenChange(false);
    requestAnimationFrame(() => returnFocusRef?.current?.focus());
  }, [onMobileOpenChange, returnFocusRef]);

  function selectTab(tab: DashboardTab) {
    onSelect(tab);
    onMobileOpenChange(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    closeButtonRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMobile();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMobile]);

  return (
    <>
      {/* Desktop: hover-expand rail */}
      <aside
        className="peer/sidebar group/sidebar fixed inset-y-0 left-0 z-40 hidden w-[4.5rem] flex-col border-r border-surface-line bg-ink-800/95 backdrop-blur-xl transition-[width] duration-300 ease-out hover:w-60 lg:flex"
        aria-label="Dashboard navigation"
      >
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

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            Workspace
          </p>
          {items.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={active === item.id}
              onClick={() => onSelect(item.id)}
              compact
            />
          ))}
        </nav>

        <div className="shrink-0 border-t border-surface-line p-2">
          {userEmail && (
            <button
              type="button"
              onClick={() => onSelect("settings")}
              title="Account settings"
              className={`group/profile mb-1 flex w-full items-center gap-3 overflow-hidden rounded-xl px-2 py-2 text-left transition-colors ${
                active === "settings" ? "bg-brand-600/20" : "hover:bg-surface-overlay"
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

      {/* Mobile: slide-over drawer (mounted only while open) */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-surface-scrim backdrop-blur-sm lg:hidden"
            onClick={closeMobile}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] translate-x-0 flex-col border-r border-surface-line bg-ink-800/98 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-surface-line px-4">
              <BrandMark showWordmark />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMobile}
                className="grid h-9 w-9 place-items-center rounded-lg text-fg-muted transition hover:bg-surface-overlay hover:text-fg"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Workspace
              </p>
              {items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  isActive={active === item.id}
                  onClick={() => selectTab(item.id)}
                />
              ))}
            </nav>

            <div className="shrink-0 border-t border-surface-line p-3">
              {userEmail && (
                <button
                  type="button"
                  onClick={() => selectTab("settings")}
                  className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active === "settings" ? "bg-brand-600/20" : "hover:bg-surface-overlay"
                  }`}
                >
                  <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-200">
                    {userInitial(userEmail)}
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border border-ink-800 bg-ink-700 text-fg-muted">
                      <Settings className="h-2.5 w-2.5" />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-fg-muted">Account</p>
                    <p className="truncate text-sm font-medium text-fg-body">{userEmail}</p>
                  </div>
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-fg-muted transition-colors hover:bg-surface-overlay hover:text-fg"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">Log out</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Mobile: bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-line bg-ink-800/95 pb-[env(safe-area-inset-bottom,0px)] shadow-nav backdrop-blur-xl lg:hidden"
        aria-label="Quick navigation"
      >
        <div className="grid grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition sm:py-3 sm:text-xs ${
                  isActive ? "text-brand-300" : "text-fg-muted"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-brand-400" : ""}`} />
                <span className="max-w-full truncate">
                  {item.shortLabel ?? item.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => selectTab("settings")}
            className={`flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition sm:py-3 sm:text-xs ${
              active === "settings" ? "text-brand-300" : "text-fg-muted"
            }`}
          >
            <Settings className={`h-5 w-5 ${active === "settings" ? "text-brand-400" : ""}`} />
            <span>Account</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export const DashboardMenuButton = forwardRef<HTMLButtonElement, { onClick: () => void }>(
  function DashboardMenuButton({ onClick }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-surface-line bg-surface-overlay text-fg-muted transition hover:bg-surface-overlay-hover hover:text-fg lg:hidden"
        aria-label="Open menu"
        aria-haspopup="dialog"
      >
        <Menu className="h-5 w-5" />
      </button>
    );
  }
);

import { useCallback, useEffect, useRef, useState } from "react";
import { Database, LayoutDashboard, Megaphone } from "lucide-react";
import KnowledgePanel from "../components/KnowledgePanel";
import OutreachPanel from "../components/OutreachPanel";
import OverviewPanel from "../components/dashboard/OverviewPanel";
import SettingsPanel from "../components/dashboard/SettingsPanel";
import DashboardSidebar, {
  type DashboardNavItem,
  type DashboardTab,
} from "../components/dashboard/DashboardSidebar";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import { useAuth } from "../context/AuthContext";
import { api, type HealthConfigured, type Stats } from "../lib/api";

const NAV: DashboardNavItem[] = [
  { id: "overview", label: "Overview", shortLabel: "Overview", icon: LayoutDashboard, hint: "Stats & summary" },
  { id: "knowledge", label: "Knowledge Base", shortLabel: "Knowledge", icon: Database, hint: "RAG sources" },
  { id: "outreach", label: "Outreach Matrix", shortLabel: "Outreach", icon: Megaphone, hint: "Leads & campaigns" },
];

const PAGE_META: Record<DashboardTab, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "Your outreach workspace at a glance.",
  },
  knowledge: {
    title: "Knowledge Base",
    subtitle: "Ingest content so every email is grounded in your product story.",
  },
  outreach: {
    title: "Outreach Matrix",
    subtitle: "Launch campaigns, review leads, and generate personalized emails.",
  },
  settings: {
    title: "Account settings",
    subtitle: "Profile, integrations, and preferences.",
  },
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthConfigured | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([api.stats(), api.health()]);
      setStats(s.stats);
      setHealth(h.configured);
    } catch {
      /* backend may be offline; UI still renders */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const meta = PAGE_META[tab];
  const isFixedPanel = tab === "knowledge" || tab === "settings" || tab === "outreach";

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-ink-900 min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden">
      <DashboardSidebar
        items={NAV}
        active={tab}
        onSelect={setTab}
        userEmail={user?.email}
        onLogout={logout}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        returnFocusRef={menuButtonRef}
      />

      <div className="flex min-h-[100dvh] w-full max-w-full flex-col pl-0 lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden lg:pl-[4.5rem] lg:transition-[padding] lg:duration-300 lg:ease-out lg:peer-hover/sidebar:pl-60">
        <DashboardHeader
          title={meta.title}
          subtitle={meta.subtitle}
          onOpenMenu={() => setMobileNavOpen(true)}
          menuButtonRef={menuButtonRef}
        />

        <main
          className={`flex flex-col px-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:px-6 lg:min-h-0 lg:flex-1 lg:px-8 lg:pb-8 ${
            isFixedPanel
              ? "py-4 lg:overflow-hidden"
              : "overflow-y-auto py-6 sm:py-8"
          }`}
        >
          {tab === "overview" && <OverviewPanel stats={stats} onNavigate={setTab} />}
          {tab === "knowledge" && (
            <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              <KnowledgePanel onChanged={refresh} />
            </div>
          )}
          {tab === "outreach" && (
            <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              <OutreachPanel onChanged={refresh} health={health} />
            </div>
          )}
          {tab === "settings" && (
            <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              <SettingsPanel user={user} health={health} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

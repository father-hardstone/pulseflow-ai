import { useCallback, useEffect, useState } from "react";
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
  { id: "overview", label: "Overview", icon: LayoutDashboard, hint: "Stats & summary" },
  { id: "knowledge", label: "Knowledge Base", icon: Database, hint: "RAG sources" },
  { id: "outreach", label: "Outreach Matrix", icon: Megaphone, hint: "Leads & campaigns" },
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

  return (
    <div className="h-screen overflow-hidden bg-ink-900">
      <DashboardSidebar
        items={NAV}
        active={tab}
        onSelect={setTab}
        userEmail={user?.email}
        onLogout={logout}
      />

      <div className="flex h-screen min-h-0 flex-col overflow-hidden pl-[4.5rem] transition-[padding] duration-300 ease-out peer-hover/sidebar:pl-60">
        <DashboardHeader title={meta.title} subtitle={meta.subtitle} />

        <main
          className={`flex min-h-0 flex-1 flex-col px-6 lg:px-8 ${
            tab === "knowledge" || tab === "settings" || tab === "outreach"
              ? "overflow-hidden py-4"
              : "overflow-y-auto py-8"
          }`}
        >
          {tab === "overview" && <OverviewPanel stats={stats} onNavigate={setTab} />}
          {tab === "knowledge" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <KnowledgePanel onChanged={refresh} />
            </div>
          )}
          {tab === "outreach" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <OutreachPanel onChanged={refresh} health={health} />
            </div>
          )}
          {tab === "settings" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <SettingsPanel user={user} health={health} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

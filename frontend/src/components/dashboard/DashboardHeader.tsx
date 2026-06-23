import ThemeToggle from "../ThemeToggle";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-surface-line bg-ink-900/80 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}

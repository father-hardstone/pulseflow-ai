import type { Ref } from "react";
import ThemeToggle from "../ThemeToggle";
import { DashboardMenuButton } from "./DashboardSidebar";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onOpenMenu?: () => void;
  menuButtonRef?: Ref<HTMLButtonElement>;
}

export default function DashboardHeader({
  title,
  subtitle,
  onOpenMenu,
  menuButtonRef,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-surface-line bg-ink-900/80 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3 px-4 py-3 sm:items-center sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          {onOpenMenu && <DashboardMenuButton ref={menuButtonRef} onClick={onOpenMenu} />}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-fg sm:text-xl lg:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted sm:line-clamp-none sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}

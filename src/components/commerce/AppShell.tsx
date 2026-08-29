import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  Users,
  MapPin,
  Settings,
  RotateCw,
  Plus,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

const NAV: Array<{ to: string; label: string; icon: LucideIcon; exact?: boolean }> = [
  { to: "/", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/appels-offres", label: "Appels d'offres", icon: Briefcase },
  { to: "/catalogues", label: "Catalogues BPU", icon: BookOpen },
  { to: "/fournisseurs", label: "Fournisseurs", icon: Users },
  { to: "/prospection", label: "Prospection", icon: MapPin },
  { to: "/admin", label: "Administration", icon: Settings },
];

export function AppShell({
  title,
  subtitle,
  children,
  actions,
  flush = false,
  syncLabel,
  primaryAction,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  flush?: boolean;
  syncLabel?: string | null;
  primaryAction?: { label: string; onClick: () => void };
  contentClassName?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="commerce-shell flex h-dvh max-h-dvh flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-14 border-r border-black/10 bg-gradient-to-b from-[#1e3a8a] via-[#3730a3] to-[#7c3aed] text-white lg:flex">
            <div className="flex h-full w-full flex-col">
              <div className="border-b border-white/15 p-2">
                <Link
                  to="/"
                  className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-white/10"
                >
                  <img src="/logo-meselec.svg" alt="Meselec" className="h-7" />
                </Link>
              </div>
              <ScrollArea className="flex-1 px-1.5 py-3">
                <nav className="flex flex-col items-center space-y-2.5">
                  {NAV.map((item) => {
                    const active = item.exact
                      ? pathname === item.to
                      : pathname.startsWith(item.to);
                    const Icon = item.icon;
                    return (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.to}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                              active
                                ? "bg-white/20 text-white shadow-sm"
                                : "text-white/80 hover:bg-white/15 hover:text-white",
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" strokeWidth={2.6} />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </nav>
              </ScrollArea>
              <div className="space-y-1.5 border-t border-white/15 p-1.5">
                <div className="flex flex-col items-center gap-1 rounded-lg bg-black/20 p-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white/80 hover:bg-white/10 hover:text-white"
                        onClick={() => document.documentElement.classList.toggle("dark")}
                      >
                        <Sun className="h-3.5 w-3.5" strokeWidth={2.6} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Thème</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white/80 hover:bg-white/10 hover:text-white"
                        onClick={() => window.location.reload()}
                      >
                        <RotateCw className="h-3.5 w-3.5" strokeWidth={2.6} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Actualiser</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </aside>

          <main className="ml-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-14">
            <header className="z-10 shrink-0 border-b border-border/40 bg-background px-4 py-2.5 sm:px-6">
              <div className="mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
                  {(subtitle || syncLabel) && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {subtitle}
                      {subtitle && syncLabel ? " · " : null}
                      {syncLabel ? `Dernière synchro ERP : ${syncLabel}` : null}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {actions}
                  {primaryAction ? (
                    <Button size="sm" className="gap-2" onClick={primaryAction.onClick}>
                      <Plus className="h-4 w-4" />
                      {primaryAction.label}
                    </Button>
                  ) : null}
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2 py-1">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                        M
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left sm:block">
                      <p className="text-xs font-medium leading-none">mathieu</p>
                      <p className="text-[10px] text-muted-foreground">Compte</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div
              className={cn(
                "commerce-main-enter min-h-0 flex-1 overflow-y-auto overscroll-y-none",
                flush
                  ? ""
                  : "mx-auto w-full max-w-[1920px] px-4 py-6 sm:px-6",
                contentClassName,
              )}
            >
              {children}
            </div>
          </main>
        </div>

        <nav className="flex shrink-0 gap-1 overflow-x-auto border-t bg-card p-2 lg:hidden">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
}

export function Panel({
  title,
  children,
  actions,
  className,
  bodyClassName,
  description,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  description?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border bg-card shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatusBadge({
  statut,
  labels,
}: {
  statut: string;
  labels: Record<string, string>;
}) {
  const colors: Record<string, string> = {
    veille: "bg-slate-100 text-slate-700",
    analyse: "bg-violet-100 text-violet-800",
    en_cours: "bg-sky-100 text-sky-800",
    depose: "bg-cyan-100 text-cyan-800",
    gagne: "bg-emerald-100 text-emerald-800",
    perdu: "bg-rose-100 text-rose-800",
    abandonne: "bg-neutral-200 text-neutral-700",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        colors[statut] ?? "bg-muted text-foreground",
      )}
    >
      {labels[statut] ?? statut}
    </span>
  );
}

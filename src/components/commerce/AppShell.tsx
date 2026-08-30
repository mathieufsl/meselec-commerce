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
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MeselecAppLogoSwitcher } from "@/components/MeselecAppLogoSwitcher";
import { CommerceProfileMenu } from "@/components/commerce/CommerceProfileMenu";
import { AO_STATUT_STYLES } from "@/lib/aoStatusStyles";
import type { AoStatut } from "@/lib/commerceTypes";

const NAV: Array<{ to: string; label: string; icon: LucideIcon; exact?: boolean }> = [
  { to: "/", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/appels-offres", label: "Appels d'offres", icon: Briefcase },
  { to: "/catalogues", label: "Catalogues BPU", icon: BookOpen },
  { to: "/fournisseurs", label: "Fournisseurs", icon: Users },
  { to: "/prospection", label: "Prospection", icon: MapPin },
  { to: "/admin", label: "Administration", icon: Settings },
];

const MOBILE_LABELS: Record<string, string> = {
  "/": "Accueil",
  "/appels-offres": "AO",
  "/catalogues": "BPU",
  "/fournisseurs": "Fourn.",
  "/prospection": "Prospect",
  "/admin": "Admin",
};

function sidebarItemClass(active: boolean) {
  return cn(
    "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150",
    active
      ? "bg-white/20 text-white shadow-sm before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-white"
      : "text-white/80 hover:bg-white/15 hover:text-white",
  );
}

export function AppShell({
  title,
  subtitle,
  children,
  actions,
  back,
  banner,
  belowHeader,
  flush = false,
  syncLabel,
  primaryAction,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  back?: { to: string; label?: string };
  banner?: React.ReactNode;
  belowHeader?: React.ReactNode;
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
          <aside className="rms-sidebar fixed bottom-0 left-0 top-0 z-40 hidden w-14 lg:flex">
            <div className="flex h-full w-full flex-col">
              <div className="rms-sidebar-divider border-b p-2">
                <MeselecAppLogoSwitcher />
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
                            className={sidebarItemClass(active)}
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
              <div className="rms-sidebar-divider space-y-1.5 border-t p-1.5">
                <div className="rms-sidebar-tools flex flex-col items-center gap-1 rounded-lg p-1">
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
            <header className="z-10 shrink-0 border-b border-border/60 bg-card/80 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:px-6">
              <div className="mx-auto w-full max-w-[1920px]">
                <div className="flex flex-nowrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    {back ? (
                      <Link to={back.to} className="shrink-0">
                        <Button variant="outline" size="sm" className="h-8 gap-1 px-2 sm:px-3">
                          <ChevronLeft className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only">{back.label ?? "Retour"}</span>
                        </Button>
                      </Link>
                    ) : null}
                    <div className="min-w-0">
                      <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight sm:text-base">
                        {title}
                      </h1>
                      {(subtitle || syncLabel) && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {subtitle}
                          {subtitle && syncLabel ? " · " : null}
                          {syncLabel ? `Dernière synchro ERP : ${syncLabel}` : null}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-0 shrink items-center justify-end gap-2">
                    {banner ? <div className="flex items-center gap-1.5">{banner}</div> : null}
                    {actions}
                    {primaryAction ? (
                      <Button size="sm" className="gap-2" onClick={primaryAction.onClick}>
                        <Plus className="h-4 w-4" />
                        {primaryAction.label}
                      </Button>
                    ) : null}
                    <CommerceProfileMenu className="shrink-0" />
                  </div>
                </div>
              </div>
            </header>

            {belowHeader ? (
              <div className="z-20 shrink-0 border-b border-border/60">{belowHeader}</div>
            ) : null}

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

        <nav className="grid shrink-0 grid-cols-6 gap-0.5 border-t border-border/60 bg-card/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            const short = MOBILE_LABELS[item.to] ?? item.label;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[10px] font-medium leading-none transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground active:bg-muted",
                )}
              >
                <Icon className={cn("h-[18px] w-[18px]", active && "stroke-[2.4]")} />
                <span className="w-full truncate text-center">{short}</span>
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
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(16,24,40,0.25)]",
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          ) : null}
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
  const style = AO_STATUT_STYLES[statut as AoStatut];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        style?.badge ?? "bg-muted text-foreground ring-border",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style?.dot ?? "bg-muted-foreground")} />
      {labels[statut] ?? statut}
    </span>
  );
}

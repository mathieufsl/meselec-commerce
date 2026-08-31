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
import { ThemeSegmentToggle } from "@/components/ThemeSegmentToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  titleIcon: TitleIcon,
  children,
  actions,
  back,
  banner,
  belowHeader,
  flush = false,
  syncLabel,
  primaryAction,
  headerExtra,
  contentClassName,
  mobileFooter,
}: {
  title: string;
  subtitle?: string;
  titleIcon?: LucideIcon;
  children: React.ReactNode;
  actions?: React.ReactNode;
  back?: { to: string; label?: string; onNavigate?: () => void };
  banner?: React.ReactNode;
  belowHeader?: React.ReactNode;
  flush?: boolean;
  syncLabel?: string | null;
  primaryAction?: { label: string; onClick: () => void };
  headerExtra?: React.ReactNode;
  contentClassName?: string;
  mobileFooter?: React.ReactNode;
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
                      <div>
                        <ThemeToggle
                          iconOnly
                          className="h-7 w-7 text-white/80 hover:bg-white/10 hover:text-white hover:bg-transparent"
                        />
                      </div>
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
            <header className="z-10 shrink-0 border-b border-border/80 bg-background/95 px-3 pb-2 pt-[max(0.375rem,env(safe-area-inset-top))] backdrop-blur-md supports-[backdrop-filter]:bg-background/90 sm:px-6 lg:py-3">
              <div className="mx-auto w-full max-w-[1920px]">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-nowrap sm:justify-between sm:gap-3">
                  <div className="flex min-w-0 items-center gap-2 sm:flex-1 sm:gap-3">
                    {back ? (
                      back.onNavigate ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 gap-1 p-0 sm:h-8 sm:w-auto sm:px-3 shrink-0"
                          onClick={back.onNavigate}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only">{back.label ?? "Retour"}</span>
                        </Button>
                      ) : (
                        <Link to={back.to} className="shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 gap-1 p-0 sm:h-8 sm:w-auto sm:px-3"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only sm:not-sr-only">{back.label ?? "Retour"}</span>
                          </Button>
                        </Link>
                      )
                    ) : null}
                    <div className="flex min-w-0 items-center gap-2.5">
                      {TitleIcon ? (
                        <TitleIcon className="hidden h-5 w-5 shrink-0 text-primary sm:block" strokeWidth={2.2} />
                      ) : null}
                      <div className="min-w-0">
                        <h1 className="truncate text-base font-semibold leading-tight tracking-tight lg:text-xl lg:font-bold">
                          {title}
                        </h1>
                        {(subtitle || syncLabel) && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {subtitle}
                            {subtitle && syncLabel ? (
                              <span className="hidden sm:inline">
                                {" · "}
                                {`Dernière synchro ERP : ${syncLabel}`}
                              </span>
                            ) : null}
                            {!subtitle && syncLabel ? (
                              <span className="hidden sm:inline">{`Dernière synchro ERP : ${syncLabel}`}</span>
                            ) : null}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-1.5 sm:min-w-0 sm:shrink sm:gap-2">
                    {headerExtra ? (
                      <div className="hidden items-center sm:flex">{headerExtra}</div>
                    ) : null}
                    {banner ? (
                      <div className="hidden items-center gap-1.5 sm:flex">{banner}</div>
                    ) : null}
                    <div className="hidden items-center gap-2 sm:flex">{actions}</div>
                    {primaryAction ? (
                      <Button
                        size="sm"
                        className="h-9 w-9 gap-2 p-0 sm:h-8 sm:w-auto sm:px-3"
                        onClick={primaryAction.onClick}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only">{primaryAction.label}</span>
                      </Button>
                    ) : null}
                    <ThemeSegmentToggle />
                    <CommerceProfileMenu className="shrink-0" />
                  </div>
                </div>

                {(actions || banner || headerExtra) && (
                  <div className="mt-1.5 flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
                    {headerExtra}
                    {banner}
                    {actions}
                  </div>
                )}
              </div>
            </header>

            {belowHeader ? (
              <div className="z-20 shrink-0 border-b border-border/60">{belowHeader}</div>
            ) : null}

            <div
              className={cn(
                "commerce-main-enter min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-none",
                flush ? "" : "mx-auto w-full max-w-[1920px] px-3 py-4 sm:px-6 sm:py-6",
                contentClassName,
              )}
            >
              {children}
            </div>

            {mobileFooter ? (
              <div className="shrink-0 border-t border-border/80 bg-background lg:hidden">
                {mobileFooter}
              </div>
            ) : null}
          </main>
        </div>

        <nav className="grid shrink-0 grid-cols-6 gap-0 border-t border-border/60 bg-card/95 px-0.5 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden">
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
                  "flex min-h-[42px] flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-0.5 text-[10px] font-medium leading-none transition-colors",
                  active ? "text-primary" : "text-muted-foreground active:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-9 items-center justify-center rounded-full transition-colors",
                    active ? "bg-primary/12" : "bg-transparent",
                  )}
                >
                  <Icon className={cn("h-[17px] w-[17px]", active && "stroke-[2.5]")} />
                </span>
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
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2 sm:px-4 lg:py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className={cn("p-3 sm:p-4", bodyClassName)}>{children}</div>
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
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        style?.badge ?? "bg-muted text-foreground border-border",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style?.dot ?? "bg-muted-foreground")} />
      {labels[statut] ?? statut}
    </span>
  );
}

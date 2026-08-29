import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Accueil", exact: true, hint: "Pipeline AO" },
  { to: "/appels-offres", label: "Appels d'offres", hint: "Marchés" },
  { to: "/catalogues", label: "Catalogues", hint: "BPU · DPGF" },
  { to: "/fournisseurs", label: "Fournisseurs", hint: "Répertoire" },
  { to: "/prospection", label: "Prospection", hint: "Communes IDF" },
  { to: "/admin", label: "Admin", hint: "Sync · Params" },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
  actions,
  flush = false,
  syncLabel,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  flush?: boolean;
  syncLabel?: string | null;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="commerce-shell flex h-dvh min-h-0 flex-col overflow-hidden text-[var(--commerce-fg)]">
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[188px] shrink-0 flex-col bg-[var(--commerce-side)] text-[var(--commerce-side-text)] md:flex">
          <div className="relative overflow-hidden border-b border-white/8 px-4 py-4">
            <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[var(--commerce-accent)]/25 blur-2xl" />
            <Link to="/" className="relative block">
              <span
                className="block text-[15px] font-semibold tracking-[-0.02em] text-white"
                style={{ fontFamily: "var(--commerce-display)" }}
              >
                PÔLE COMMERCE
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--commerce-accent)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--commerce-accent)] shadow-[0_0_0_3px_var(--commerce-accent-soft)]" />
                Mutualisé
              </span>
            </Link>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
            {NAV.map((item) => {
              const active =
                "exact" in item && item.exact
                  ? pathname === item.to
                  : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group relative rounded-md px-2.5 py-2 transition-colors duration-150",
                    active
                      ? "bg-white/10 text-[var(--commerce-side-active)]"
                      : "hover:bg-white/5 hover:text-white/90",
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[var(--commerce-accent)]" />
                  ) : null}
                  <span
                    className={cn(
                      "block text-[12.5px] font-semibold tracking-tight",
                      active && "text-white",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="block text-[10px] opacity-70">{item.hint}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/8 bg-[var(--commerce-side-elevated)] px-3.5 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
              ERP bridge
            </p>
            <p className="mt-1 text-[11px] text-white/70">
              {syncLabel ?? "Non synchronisé"}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-[var(--commerce-border)]/80 bg-[var(--commerce-panel)]/90 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 md:px-5">
              <div className="min-w-0 md:hidden">
                <Link
                  to="/"
                  className="text-[13px] font-semibold tracking-tight"
                  style={{ fontFamily: "var(--commerce-display)" }}
                >
                  Commerce
                </Link>
              </div>
              <nav className="flex max-w-full flex-wrap gap-1 overflow-x-auto md:hidden">
                {NAV.map((item) => {
                  const active =
                    "exact" in item && item.exact
                      ? pathname === item.to
                      : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold",
                        active
                          ? "bg-[var(--commerce-ink)] text-white"
                          : "bg-[var(--commerce-row)] text-[var(--commerce-muted)]",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="hidden min-w-0 flex-1 md:block">
                <div className="flex items-baseline gap-3">
                  <h1
                    className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--commerce-ink)]"
                    style={{ fontFamily: "var(--commerce-display)" }}
                  >
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="truncate text-[12px] text-[var(--commerce-muted)]">{subtitle}</p>
                  ) : null}
                </div>
              </div>
              {actions}
            </div>
          </header>

          <main
            className={cn(
              "commerce-main-enter min-h-0 flex-1 overflow-auto",
              flush ? "p-0" : "space-y-4 px-3 py-4 md:px-5 md:py-5",
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function Panel({
  title,
  children,
  actions,
  className,
  bodyClassName,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--commerce-border)] bg-[var(--commerce-panel)] shadow-[var(--commerce-shadow)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--commerce-border)] bg-gradient-to-r from-[var(--commerce-row)] to-[var(--commerce-panel)] px-4 py-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--commerce-muted)]">
          {title}
        </h2>
        {actions}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiStrip({
  items,
  className,
}: {
  items: Array<{
    label: string;
    value: string;
    hint?: string;
    tone?: "default" | "good" | "bad" | "warn";
  }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--commerce-border)] bg-[var(--commerce-panel)] shadow-[var(--commerce-shadow)]",
        className,
      )}
    >
      <div className="flex min-w-full divide-x divide-[var(--commerce-border)] overflow-x-auto">
        {items.map((item) => (
          <div key={item.label} className="min-w-[140px] flex-1 px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--commerce-muted)]">
              {item.label}
            </p>
            <p
              className={cn(
                "mt-1.5 text-[18px] font-semibold tracking-tight",
                item.tone === "good" && "text-[var(--commerce-good)]",
                item.tone === "bad" && "text-[var(--commerce-bad)]",
                item.tone === "warn" && "text-[var(--commerce-warn)]",
              )}
              style={{ fontFamily: "var(--commerce-mono)" }}
            >
              {item.value}
            </p>
            {item.hint ? (
              <p className="mt-1 text-[10px] text-[var(--commerce-muted)]">{item.hint}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatusBadge({
  statut,
  labels,
}: {
  statut: string;
  labels: Record<string, string>;
}) {
  return (
    <span className="inline-flex rounded-full bg-[var(--commerce-row)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--commerce-ink)]">
      {labels[statut] ?? statut}
    </span>
  );
}

import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { CURRENT_MESELEC_APP_ID, getMeselecApps } from "@/lib/meselecApps";
import { cn } from "@/lib/utils";

const HOME_HREF = "/";
const HOVER_CLOSE_MS = 160;
const APP_BRAND_NAME = "RMSCom";
const LOGO_SRC = "/logo-rms.png";

function menuItemClass(active: boolean) {
  return cn(
    "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
    active
      ? "cursor-default bg-muted font-medium text-foreground"
      : "text-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

export function MeselecAppLogoSwitcher({ className }: { className?: string }) {
  const apps = getMeselecApps();
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  }

  return (
    <div className={cn("relative", className)} onMouseLeave={scheduleClose}>
      <Link
        to={HOME_HREF}
        className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        aria-label={`Accueil ${APP_BRAND_NAME}`}
        onMouseEnter={openMenu}
      >
        <img
          src={LOGO_SRC}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
        />
      </Link>

      {open ? (
        <div
          className="absolute left-full top-0 z-50 pl-1"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className="w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Applications RMS
            </p>
            <div className="my-1 h-px bg-border" />
            <ul className="space-y-0.5">
              {apps.map((app) => {
                const active = app.id === CURRENT_MESELEC_APP_ID;
                return (
                  <li key={app.id}>
                    {active ? (
                      <span className={menuItemClass(true)}>
                        <span>{app.label}</span>
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      </span>
                    ) : (
                      <a href={app.href} className={menuItemClass(false)}>
                        {app.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

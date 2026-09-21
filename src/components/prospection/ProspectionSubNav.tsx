import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { List, Map } from "lucide-react";

const TABS = [
  { to: "/prospection", label: "Liste", icon: List, match: (pathname: string) => pathname === "/prospection" || pathname === "/prospection/" },
  { to: "/prospection/cartes", label: "Cartes", icon: Map, match: (pathname: string) => pathname.startsWith("/prospection/cartes") },
] as const;

export function ProspectionSubNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex items-center gap-1 px-3 py-2 sm:px-6">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

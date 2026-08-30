import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function CommerceQuickAction({
  to,
  label,
  icon: Icon,
  dashed = false,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  dashed?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition-colors active:bg-muted/60 hover:bg-muted/40 sm:min-h-0 sm:rounded-md",
        dashed
          ? "border-dashed border-muted-foreground/45 bg-muted/35 text-muted-foreground hover:bg-muted/55"
          : "border-border/90 bg-background",
      )}
    >

      {!dashed ? (
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/12 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {label}
    </Link>
  );
}

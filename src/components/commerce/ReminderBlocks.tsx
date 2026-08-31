import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReminderSheetSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {title ? (
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
        {children}
      </div>
    </div>
  );
}

export function ReminderRow({
  icon: Icon,
  iconClassName,
  label,
  children,
  last = false,
  onClick,
}: {
  icon?: LucideIcon;
  iconClassName?: string;
  label: string;
  children: React.ReactNode;
  last?: boolean;
  onClick?: () => void;
}) {
  const Row = onClick ? "button" : "div";
  return (
    <Row
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full min-h-[44px] items-center gap-3 px-3 text-left",
        !last && "border-b border-border/50",
        onClick && "transition-colors hover:bg-muted/40 active:bg-muted/60",
      )}
    >
      {Icon ? (
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
            iconClassName,
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
        </div>
      ) : (
        <div className="w-7 shrink-0" />
      )}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2.5">
        <span className="shrink-0 text-sm text-foreground">{label}</span>
        <div className="min-w-0 flex-1 text-right">{children}</div>
      </div>
    </Row>
  );
}

export function ReminderField({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full min-w-0 border-0 bg-transparent text-right text-sm text-foreground outline-none placeholder:text-muted-foreground/60",
        className,
      )}
      {...props}
    />
  );
}

export function ReminderSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "max-w-[58%] truncate border-0 bg-transparent text-right text-sm text-primary outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

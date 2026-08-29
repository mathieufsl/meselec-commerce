import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type KpiVariant = "alert" | "neutral" | "positive";

const variantStyles: Record<KpiVariant, string> = {
  alert: "border-amber-200/80 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5",
  neutral: "border-border/80 bg-card",
  positive: "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/5",
};

const iconStyles: Record<KpiVariant, string> = {
  alert: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  neutral: "bg-primary/10 text-primary",
  positive: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

export function CommerceKpiBrick({
  title,
  value,
  icon: Icon,
  isLoading,
  href,
  variant = "neutral",
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  isLoading?: boolean;
  href?: string;
  variant?: KpiVariant;
}) {
  const content = (
    <Card
      className={cn(
        "overflow-hidden border shadow-sm transition-all duration-200 min-w-0",
        variantStyles[variant],
        href && "group cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <CardContent className="relative px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 truncate text-xs font-medium leading-tight text-muted-foreground">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="text-lg font-bold leading-tight tracking-tight text-foreground">{value}</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              iconStyles[variant],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

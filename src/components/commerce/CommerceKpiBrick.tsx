import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type KpiVariant = "alert" | "neutral" | "positive";

const variantStyles: Record<KpiVariant, string> = {
  alert: "border-warning/30 bg-warning-subtle/60",
  neutral: "border-border/80 bg-card",
  positive: "border-success/30 bg-success-subtle/60",
};

const iconStyles: Record<KpiVariant, string> = {
  alert: "bg-warning/15 text-warning",
  neutral: "bg-primary/10 text-primary",
  positive: "bg-success/15 text-success",
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

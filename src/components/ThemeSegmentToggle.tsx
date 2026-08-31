import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeSegmentToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={cn(
        "flex h-8 shrink-0 items-center rounded-lg border border-border/60 bg-muted/50 p-0.5",
        className,
      )}
      role="group"
      aria-label="Thème"
    >
      <button
        type="button"
        aria-label="Thème sombre"
        aria-pressed={isDark}
        onClick={() => setTheme("dark")}
        className={cn(
          "flex h-7 w-8 items-center justify-center rounded-md transition-colors",
          isDark
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Moon className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        aria-label="Thème clair"
        aria-pressed={!isDark}
        onClick={() => setTheme("light")}
        className={cn(
          "flex h-7 w-8 items-center justify-center rounded-md transition-colors",
          !isDark
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Sun className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type AoSection = {
  id: string;
  label: string;
  number: number;
};

type AoDetailSommaireProps = {
  sections: AoSection[];
  activeId: string;
  onNavigate: (id: string) => void;
};

const SCROLL_ROOT_SELECTOR = ".commerce-main-enter";
const SCROLL_OFFSET = 96;

function getScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(SCROLL_ROOT_SELECTOR);
}

/** Mobile: horizontal pills */
export function AoDetailSommaireMobile({ sections, activeId, onNavigate }: AoDetailSommaireProps) {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 flex gap-1.5 overflow-x-auto border-b bg-background/95 px-4 py-2 backdrop-blur xl:hidden">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onNavigate(s.id)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            activeId === s.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** Desktop: Notion-style floating bars + hover popover (overlay, no layout column) */
export function AoDetailSommaireFloating({ sections, activeId, onNavigate }: AoDetailSommaireProps) {
  const [hovered, setHovered] = useState(false);
  const activeIndex = sections.findIndex((s) => s.id === activeId);

  return (
    <div
      className="pointer-events-none fixed inset-y-0 right-0 z-40 hidden w-10 xl:block"
      aria-hidden={!hovered}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-end">
        {/* Popover — opens to the left of the bars */}
        <div
          className={cn(
            "absolute right-7 top-1/2 -translate-y-1/2 transition-all duration-200 ease-out",
            hovered
              ? "pointer-events-auto translate-x-0 opacity-100"
              : "pointer-events-none translate-x-3 opacity-0",
          )}
        >
          <nav className="min-w-[220px] rounded-lg border border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur-md">
            <ol className="space-y-0.5">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(s.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      activeId === s.id
                        ? "font-medium text-primary"
                        : i < activeIndex
                          ? "text-muted-foreground/80 hover:bg-muted/50 hover:text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <span className="shrink-0 tabular-nums text-xs opacity-50">{s.number}.</span>
                    <span className="leading-snug">{s.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Bars — length & opacity reflect scroll position */}
        <div className="flex flex-col items-end gap-2 py-2">
          {sections.map((s, i) => {
            const isActive = activeId === s.id;
            const isPast = i < activeIndex;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={s.label}
                aria-current={isActive ? "true" : undefined}
                onClick={() => onNavigate(s.id)}
                className="group flex h-3 items-center justify-end"
              >
                <span
                  className={cn(
                    "block rounded-full transition-all duration-300 ease-out",
                    isActive
                      ? "h-1 w-6 bg-primary ring-2 ring-primary/20"
                      : isPast
                        ? "h-0.5 w-4 bg-muted-foreground/55 group-hover:w-5 group-hover:bg-muted-foreground/75"
                        : "h-0.5 w-3 bg-muted-foreground/25 group-hover:w-4 group-hover:bg-muted-foreground/45",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function useAoSectionObserver(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "projet");

  const detectActive = useCallback(() => {
    const scrollRoot = getScrollRoot();
    if (!scrollRoot || sectionIds.length === 0) return;

    const rootTop = scrollRoot.getBoundingClientRect().top + SCROLL_OFFSET;
    let current = sectionIds[0];

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= rootTop) {
        current = id;
      }
    }

    if (current) setActiveId(current);
  }, [sectionIds]);

  useEffect(() => {
    const scrollRoot = getScrollRoot();
    if (!scrollRoot) return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      () => detectActive(),
      {
        root: scrollRoot,
        rootMargin: `-${SCROLL_OFFSET}px 0px -45% 0px`,
        threshold: [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const el of elements) observer.observe(el);
    scrollRoot.addEventListener("scroll", detectActive, { passive: true });
    detectActive();

    return () => {
      observer.disconnect();
      scrollRoot.removeEventListener("scroll", detectActive);
    };
  }, [sectionIds.join(","), detectActive]);

  const navigate = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      const scrollRoot = getScrollRoot();
      if (!el || !scrollRoot) return;

      const rootRect = scrollRoot.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const top = elRect.top - rootRect.top + scrollRoot.scrollTop - SCROLL_OFFSET + 8;

      scrollRoot.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      setActiveId(id);
    },
    [],
  );

  return { activeId, navigate };
}

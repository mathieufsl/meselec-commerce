import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "commerce.ce.societeFilter";

export type CeSocieteFilter = string | "all";

function readFilter(): CeSocieteFilter {
  if (typeof window === "undefined") return "all";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw === "all") return "all";
    return raw;
  } catch {
    return "all";
  }
}

let filter: CeSocieteFilter = readFilter();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setCeSocieteFilter(next: CeSocieteFilter) {
  filter = next;
  if (typeof window !== "undefined") {
    try {
      if (next === "all") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }
  emit();
}

export function useCeSocieteFilter() {
  const selectedSocieteId = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => filter,
    () => filter,
  );

  const setSelectedSocieteId = useCallback((next: CeSocieteFilter) => {
    setCeSocieteFilter(next);
  }, []);

  return { selectedSocieteId, setSelectedSocieteId };
}

export function matchesCeSocieteFilter(
  societeAcheteuseId: string | null | undefined,
  filterId: CeSocieteFilter,
): boolean {
  if (filterId === "all") return true;
  return societeAcheteuseId === filterId;
}

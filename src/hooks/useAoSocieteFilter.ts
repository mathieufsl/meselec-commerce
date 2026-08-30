import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "commerce.ao.societeFilter";

export type AoSocieteFilter = string | "all";

function readFilter(): AoSocieteFilter {
  if (typeof window === "undefined") return "all";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw === "all") return "all";
    return raw;
  } catch {
    return "all";
  }
}

let filter: AoSocieteFilter = readFilter();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setAoSocieteFilter(next: AoSocieteFilter) {
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

export function useAoSocieteFilter() {
  const selectedSocieteId = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => filter,
    () => filter,
  );

  const setSelectedSocieteId = useCallback((next: AoSocieteFilter) => {
    setAoSocieteFilter(next);
  }, []);

  return { selectedSocieteId, setSelectedSocieteId };
}

export function matchesAoSocieteFilter(
  societeAttribueeId: string | null | undefined,
  filterId: AoSocieteFilter,
): boolean {
  if (filterId === "all") return true;
  return societeAttribueeId === filterId;
}

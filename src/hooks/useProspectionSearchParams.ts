import { useCallback, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

export function useProspectionSearchParams() {
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });

  const searchParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);

  const setSearchParams = useCallback(
    (next: URLSearchParams, opts?: { replace?: boolean }) => {
      const search: Record<string, string> = {};
      next.forEach((value, key) => {
        search[key] = value;
      });
      void navigate({
        to: "/prospection",
        search: search as never,
        replace: opts?.replace ?? false,
      });
    },
    [navigate],
  );

  return [searchParams, setSearchParams] as const;
}

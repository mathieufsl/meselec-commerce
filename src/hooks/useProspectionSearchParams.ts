import { useCallback, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

type ProspectionRoute = "/prospection/" | "/prospection/cartes";

function prospectionRouteFromPath(pathname: string): ProspectionRoute {
  return pathname.startsWith("/prospection/cartes") ? "/prospection/cartes" : "/prospection/";
}

export function useProspectionSearchParams() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const route = prospectionRouteFromPath(pathname);

  const searchParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);

  const setSearchParams = useCallback(
    (next: URLSearchParams, opts?: { replace?: boolean }) => {
      const search: Record<string, string> = {};
      next.forEach((value, key) => {
        search[key] = value;
      });
      void navigate({
        to: route,
        search: search as never,
        replace: opts?.replace ?? false,
      });
    },
    [navigate, route],
  );

  return [searchParams, setSearchParams] as const;
}

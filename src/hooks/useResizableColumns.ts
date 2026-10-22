import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Largeurs de colonnes redimensionnables à la souris, mémorisées dans le navigateur.
 * Double-clic sur la poignée : retour à la largeur par défaut de la colonne.
 */
export function useResizableColumns<K extends string>(
  storageKey: string,
  defaults: Record<K, number>,
  minWidth = 60,
) {
  const [widths, setWidths] = useState<Record<K, number>>(defaults);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  // Lecture après montage pour éviter un écart d'hydratation avec le rendu serveur.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setWidths({ ...defaults, ...(JSON.parse(raw) as Partial<Record<K, number>>) });
    } catch {
      /* stockage indisponible */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = useCallback(
    (next: Record<K, number>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* stockage indisponible */
      }
    },
    [storageKey],
  );

  const startResize = useCallback(
    (key: K, e: ReactPointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = widthsRef.current[key];

      const onMove = (ev: PointerEvent) => {
        const next = Math.max(minWidth, Math.round(startWidth + ev.clientX - startX));
        setWidths((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        persist(widthsRef.current);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [minWidth, persist],
  );

  const resetColumn = useCallback(
    (key: K) => {
      setWidths((prev) => {
        const next = { ...prev, [key]: defaults[key] };
        persist(next);
        return next;
      });
    },
    [defaults, persist],
  );

  const totalWidth = (Object.values(widths) as number[]).reduce((sum, w) => sum + w, 0);

  return { widths, totalWidth, startResize, resetColumn };
}

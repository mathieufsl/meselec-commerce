import { useEffect, useState } from "react";

/** Secondes écoulées depuis que `actif` est passé à vrai (0 sinon). */
export function useSecondes(actif: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!actif) {
      setS(0);
      return;
    }
    const debut = Date.now();
    const t = window.setInterval(() => setS(Math.round((Date.now() - debut) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [actif]);
  return s;
}

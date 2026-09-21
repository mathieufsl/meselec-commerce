import type { ProspectionCommuneState } from "@/lib/prospection/api";
import { normalizePrestataireName } from "@/lib/prospection/mapColors";
import { isValidPrestataire } from "@/lib/prospection/prestataireNomenclature";

export type PrestataireStat = {
  name: string;
  count: number;
  percent: number;
};

export function aggregatePrestataires(
  entries: Array<{ state: ProspectionCommuneState }>,
  topN = 15,
): PrestataireStat[] {
  const counts = new Map<string, number>();
  let withPrestataire = 0;

  for (const { state } of entries) {
    const name = normalizePrestataireName(state.prestataire);
    if (!name || !isValidPrestataire(name)) continue;
    withPrestataire++;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const total = withPrestataire || 1;

  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      percent: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"))
    .slice(0, topN);
}

export function formatPercent(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

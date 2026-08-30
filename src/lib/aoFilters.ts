import { daysUntil } from "@/lib/bpuEngine";

export type AoDateFilterPreset = "7j" | "30j" | "ce_mois" | "sans_date";

export function matchesAoDateFilter(
  dateLimite: string | null,
  dateFrom: string,
  dateTo: string,
  preset: AoDateFilterPreset | null,
): boolean {
  if (preset === "sans_date") return !dateLimite;

  if (!dateLimite) {
    if (preset || dateFrom || dateTo) return false;
    return true;
  }

  const dateKey = dateLimite.slice(0, 10);

  if (preset === "7j") {
    const d = daysUntil(dateLimite);
    return d != null && d >= 0 && d <= 7;
  }
  if (preset === "30j") {
    const d = daysUntil(dateLimite);
    return d != null && d >= 0 && d <= 30;
  }
  if (preset === "ce_mois") {
    const target = new Date(dateLimite);
    const now = new Date();
    return target.getMonth() === now.getMonth() && target.getFullYear() === now.getFullYear();
  }

  if (dateFrom && dateKey < dateFrom) return false;
  if (dateTo && dateKey > dateTo) return false;
  return true;
}

export function hasActiveDateFilter(
  dateFrom: string,
  dateTo: string,
  preset: AoDateFilterPreset | null,
): boolean {
  return Boolean(preset || dateFrom || dateTo);
}

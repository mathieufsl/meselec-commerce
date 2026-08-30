import type { ProspectionCommuneState } from "@/lib/prospection/api";

export const STATUS_OPTIONS: { value: ProspectionCommuneState["status"]; label: string }[] = [
  { value: "todo", label: "À traiter" },
  { value: "inprogress", label: "En cours" },
  { value: "done", label: "Obtenu" },
  { value: "callback", label: "Rappeler" },
  { value: "refused", label: "Refus" },
];

export const GESTION_OPTIONS: { value: ProspectionCommuneState["gestion"]; label: string }[] = [
  { value: "", label: "?" },
  { value: "commune", label: "Commune" },
  { value: "agglo", label: "Agglo" },
  { value: "syndicat", label: "Syndicat" },
];

export function aggloBadgeClass(agglo: string) {
  if (agglo.startsWith("CU")) return "bg-info-subtle text-info";
  if (agglo.startsWith("CA")) return "bg-warning-subtle text-warning";
  return "bg-success-subtle text-success";
}

export function statusRowClass(status: ProspectionCommuneState["status"]) {
  if (status === "done") return "bg-success-subtle/60";
  if (status === "refused") return "bg-error-subtle/50";
  if (status === "callback") return "bg-warning-subtle/60";
  return "";
}

export function statusSelectClass(status: ProspectionCommuneState["status"]) {
  switch (status) {
    case "done":
      return "bg-success-subtle text-success border-success/30";
    case "refused":
      return "bg-error-subtle text-error border-error/30";
    case "callback":
      return "bg-warning-subtle text-warning border-warning/30";
    case "inprogress":
      return "bg-info-subtle text-info border-info/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function statusLabel(status: ProspectionCommuneState["status"]) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function prospectionStatusBadgeClass(status: ProspectionCommuneState["status"] | "all") {
  switch (status) {
    case "done":
      return "bg-success/20 text-success";
    case "refused":
      return "bg-error/20 text-error";
    case "callback":
      return "bg-warning/20 text-warning";
    case "inprogress":
      return "bg-info/20 text-info";
    case "todo":
      return "bg-[var(--color-accent)]/20 text-[var(--color-accent)]";
    default:
      return "";
  }
}

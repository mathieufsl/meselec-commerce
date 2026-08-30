import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { AO_STATUT_STYLES } from "@/lib/aoStatusStyles";
import type { AppelOffre, AoStatut } from "@/lib/commerceTypes";
import { daysUntil, formatEuro } from "@/lib/bpuEngine";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Paperclip } from "lucide-react";

function cardContent(ao: AppelOffre) {
  const clientName = ao.clients?.nom_entreprise?.trim();
  const secondary = clientName || ao.titre;
  const detail =
    clientName && ao.titre && ao.titre.toLowerCase() !== clientName.toLowerCase() ? ao.titre : null;
  const lieu =
    ao.lieu &&
    !secondary.toLowerCase().includes(ao.lieu.toLowerCase()) &&
    !(detail?.toLowerCase().includes(ao.lieu.toLowerCase()) ?? false)
      ? ao.lieu
      : null;
  return { primary: ao.reference, secondary, detail, lieu };
}

export function CommerceAoCard({
  ao,
  statut,
  docCount,
  variant = "default",
  draggable,
  onDragStart,
}: {
  ao: AppelOffre;
  statut: AoStatut;
  docCount?: number;
  variant?: "default" | "kanban";
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const draggedRef = useRef(false);
  const days = daysUntil(ao.date_limite_depot);
  const urgent = days != null && days >= 0 && days <= 7;
  const { primary, secondary, detail, lieu } = cardContent(ao);
  const hasAmount = ao.montant_estime != null && ao.montant_estime > 0;
  const isKanban = variant === "kanban";

  const societeCode = ao.societes_exploitation?.code;

  const metaItems = [
    societeCode ? (
      <span
        key="societe"
        className="inline-flex items-center rounded bg-muted px-1 py-px font-medium text-foreground/70"
      >
        {societeCode}
      </span>
    ) : null,
    lieu ? (
      <span key="lieu" className="inline-flex max-w-[8rem] items-center gap-0.5 truncate">
        <MapPin className="h-3 w-3 shrink-0 opacity-60" />
        {lieu}
      </span>
    ) : null,
    ao.date_limite_depot ? (
      <span
        key="date"
        className={cn(
          "inline-flex items-center gap-0.5 tabular-nums",
          urgent ? "font-medium text-[var(--color-accent)]" : "",
        )}
      >
        <Calendar className="h-3 w-3 shrink-0 opacity-60" />
        {new Date(ao.date_limite_depot).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
        })}
        {days != null && days >= 0 ? ` · J-${days}` : ""}
      </span>
    ) : null,
    docCount ? (
      <span key="docs" className="inline-flex items-center gap-0.5">
        <Paperclip className="h-3 w-3 shrink-0 opacity-60" />
        {docCount}
      </span>
    ) : null,
  ].filter(Boolean);

  return (
    <Link
      to="/appels-offres/$aoId"
      params={{ aoId: ao.id }}
      draggable={draggable}
      onDragStart={(e) => {
        draggedRef.current = true;
        onDragStart?.(e);
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          draggedRef.current = false;
        }, 0);
      }}
      onClick={(e) => {
        if (draggedRef.current) {
          e.preventDefault();
        }
      }}
      className={cn(
        "group relative block overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:border-border hover:shadow-sm",
        isKanban
          ? "p-2.5 pl-3"
          : "min-h-[68px] rounded-xl p-3.5 pl-4 shadow-sm active:bg-muted/40 hover:bg-muted/20",
        draggable && "cursor-grab active:cursor-grabbing active:shadow-md",
      )}

    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-0.5",
          AO_STATUT_STYLES[statut].bar,
          isKanban && "w-1",
        )}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-semibold leading-snug text-foreground",
              isKanban ? "text-[13px]" : "text-sm",
            )}
          >
            {primary}
          </p>
          {secondary ? (
            <p
              className={cn(
                "truncate leading-snug text-muted-foreground",
                isKanban ? "text-[11px]" : "text-xs",
              )}
            >
              {secondary}
            </p>
          ) : null}
          {detail && !isKanban ? (
            <p className="truncate text-[11px] leading-snug text-muted-foreground/80">{detail}</p>
          ) : null}
        </div>
        {hasAmount ? (
          <span
            className={cn(
              "shrink-0 font-semibold tabular-nums text-foreground/80",
              isKanban ? "text-[11px]" : "text-sm",
            )}
          >
            {formatEuro(ao.montant_estime)}
          </span>
        ) : null}
      </div>

      {metaItems.length > 0 ? (
        <div
          className={cn(
            "mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground",
            isKanban ? "text-[10px]" : "text-[11px]",
          )}
        >
          {metaItems}
        </div>
      ) : null}
    </Link>
  );
}

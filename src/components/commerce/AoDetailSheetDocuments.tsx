import { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ReminderRow, ReminderSheetSection } from "@/components/commerce/ReminderBlocks";
import { useAoDocuments } from "@/hooks/useCommerceData";
import type { AoDocument } from "@/lib/commerceTypes";
import {
  AO_DOCUMENT_TYPE_LABELS,
  filterAoDocumentsByAllowedTypes,
  formatFileSize,
} from "@/lib/aoDocuments";
import { ChevronRight, FileText, Loader2 } from "lucide-react";

export function AoDetailSheetDocuments({
  aoId,
  onOpenDocument,
}: {
  aoId: string;
  onOpenDocument: (doc: AoDocument) => void;
}) {
  const { data: documents = [], isLoading } = useAoDocuments(aoId);
  const allowedDocuments = useMemo(
    () => filterAoDocumentsByAllowedTypes(documents),
    [documents],
  );

  return (
    <ReminderSheetSection title="Documents">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      ) : allowedDocuments.length === 0 ? (
        <p className="px-4 py-5 text-center text-sm text-muted-foreground">Aucun document.</p>
      ) : (
        allowedDocuments.map((doc, i) => (
          <ReminderRow
            key={doc.id}
            icon={FileText}
            label={AO_DOCUMENT_TYPE_LABELS[doc.type]}
            last={i === allowedDocuments.length - 1}
            onClick={() => onOpenDocument(doc)}
          >
            <div className="flex min-w-0 items-center justify-end gap-1">
              <div className="min-w-0 text-right">
                <p className="truncate text-sm text-muted-foreground">{doc.nom_fichier}</p>
                <p className="text-[11px] text-muted-foreground/80">
                  {doc.created_at
                    ? format(new Date(doc.created_at), "dd MMM yyyy", { locale: fr })
                    : ""}
                  {doc.taille_octets ? ` · ${formatFileSize(doc.taille_octets)}` : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            </div>
          </ReminderRow>
        ))
      )}
    </ReminderSheetSection>
  );
}

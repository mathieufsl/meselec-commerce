import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, ExternalLink, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAoDocumentPreview } from "@/hooks/useAoDocumentPreview";
import type { AoDocument } from "@/lib/commerceTypes";
import { AO_DOCUMENT_TYPE_LABELS, formatFileSize } from "@/lib/aoDocuments";
import { cn } from "@/lib/utils";

type AoDocumentTriptychProps = {
  title: string;
  description: string;
  documents: AoDocument[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDownload: (doc: AoDocument) => void;
  onDelete: (doc: AoDocument) => void;
  busyId: string | null;
};

export function AoDocumentTriptych({
  title,
  description,
  documents,
  selectedId,
  onSelect,
  onDownload,
  onDelete,
  busyId,
}: AoDocumentTriptychProps) {
  const selected = documents.find((doc) => doc.id === selectedId) ?? null;
  const preview = useAoDocumentPreview(selected);

  const openInNewTab = () => {
    const url = preview.previewSrc ?? preview.signedUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0">
      <div className="shrink-0 border-b px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{title}</h3>
            <p className="truncate text-[11px] text-muted-foreground">{description}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 font-normal">
            {documents.length} fichier{documents.length > 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Liste */}
        <div className="flex max-h-44 shrink-0 flex-col border-b lg:max-h-none lg:w-[220px] lg:border-b-0 lg:border-r">
          <div className="flex-1 overflow-y-auto">
            {documents.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">Aucun document.</p>
            ) : (
              documents.map((doc) => {
                const isSelected = doc.id === selectedId;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => onSelect(doc.id)}
                    className={cn(
                      "w-full border-b px-3 py-2.5 text-left transition-colors",
                      isSelected
                        ? "border-l-2 border-l-primary bg-primary/10"
                        : "border-l-2 border-l-transparent hover:bg-muted/50",
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                      {AO_DOCUMENT_TYPE_LABELS[doc.type]}
                      {doc.version > 1 ? ` · v${doc.version}` : ""}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium">{doc.nom_fichier}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {doc.created_at
                        ? format(new Date(doc.created_at), "dd/MM/yy HH:mm", { locale: fr })
                        : "—"}
                      {doc.taille_octets ? ` · ${formatFileSize(doc.taille_octets)}` : ""}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Aperçu */}
        <div className="flex min-h-[240px] min-w-0 flex-1 flex-col bg-muted/20 lg:min-h-0">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
              <div>
                <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p>Sélectionnez un document</p>
              </div>
            </div>
          ) : !selected.storage_path ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
              <div>
                <Paperclip className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p>Référence seule — pas de fichier à prévisualiser</p>
                {selected.notes ? (
                  <p className="mt-2 text-xs">{selected.notes}</p>
                ) : null}
              </div>
            </div>
          ) : preview.loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : preview.previewKind === "pdf" && preview.viewerSrc ? (
            <iframe
              title={selected.nom_fichier}
              src={preview.viewerSrc}
              className="h-full min-h-[240px] w-full flex-1 border-0 bg-white lg:min-h-0"
            />
          ) : preview.previewKind === "image" && preview.imageSrc ? (
            <div className="flex flex-1 items-center justify-center overflow-auto p-4">
              <img
                src={preview.imageSrc}
                alt={selected.nom_fichier}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              <FileText className="h-10 w-10 opacity-30" />
              <p>Aperçu indisponible pour ce type de fichier.</p>
              {preview.signedUrl ? (
                <Button type="button" size="sm" variant="outline" onClick={openInNewTab}>
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Ouvrir le fichier
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {/* Détails */}
        <div className="shrink-0 border-t lg:w-[260px] lg:border-l lg:border-t-0">
          {selected ? (
            <div className="space-y-3 p-3">
              <div>
                <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                  {AO_DOCUMENT_TYPE_LABELS[selected.type]}
                </Badge>
                <p className="mt-2 break-words text-sm font-semibold leading-snug">
                  {selected.nom_fichier}
                </p>
              </div>

              <dl className="space-y-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Déposé par</dt>
                  <dd className="font-medium">
                    {selected.uploaded_by_email?.split("@")[0] ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium">
                    {selected.created_at
                      ? format(new Date(selected.created_at), "dd MMM yyyy HH:mm", { locale: fr })
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Taille</dt>
                  <dd className="font-medium">{formatFileSize(selected.taille_octets)}</dd>
                </div>
                {selected.notes ? (
                  <div>
                    <dt className="text-muted-foreground">Note</dt>
                    <dd className="font-medium">{selected.notes}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1"
                  disabled={!selected.storage_path || busyId === selected.id}
                  onClick={() => onDownload(selected)}
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Télécharger
                </Button>
                {(preview.previewSrc ?? preview.signedUrl) ? (
                  <Button type="button" size="sm" variant="ghost" className="h-8" onClick={openInNewTab}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-destructive hover:text-destructive"
                  disabled={busyId === selected.id}
                  onClick={() => onDelete(selected)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center p-4 text-xs text-muted-foreground">
              Détails du document
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

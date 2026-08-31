import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAoDocumentPreview } from "@/hooks/useAoDocumentPreview";
import type { AoDocument } from "@/lib/commerceTypes";
import { AO_DOCUMENT_TYPE_LABELS, downloadAoDocument } from "@/lib/aoDocuments";
import { cn } from "@/lib/utils";
import { Download, ExternalLink, FileText, Loader2, X } from "lucide-react";

export function AoDocumentFullscreenViewer({
  doc,
  onClose,
}: {
  doc: AoDocument;
  onClose: () => void;
}) {
  const preview = useAoDocumentPreview(doc, true);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!doc.storage_path) return;
    setDownloading(true);
    try {
      await downloadAoDocument(doc);
    } finally {
      setDownloading(false);
    }
  }

  function openExternal() {
    if (!preview.previewSrc) return;
    window.open(preview.previewSrc, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Fermer</span>
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs font-medium uppercase text-muted-foreground">
            {AO_DOCUMENT_TYPE_LABELS[doc.type]}
          </p>
          <p className="truncate text-sm font-semibold">{doc.nom_fichier}</p>
        </div>
        {doc.storage_path ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            disabled={downloading}
            onClick={() => void handleDownload()}
          >
            {downloading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            <span className="sr-only">Télécharger</span>
          </Button>
        ) : (
          <div className="h-9 w-9" />
        )}
      </header>

      <div className="relative min-h-0 flex-1 bg-muted/30">
        {!doc.storage_path ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
            <FileText className="h-12 w-12 opacity-30" />
            <p>Référence seule — pas de fichier à afficher.</p>
            {doc.notes ? <p className="text-xs">{doc.notes}</p> : null}
          </div>
        ) : preview.loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : preview.previewKind === "pdf" && preview.previewSrc ? (
          <iframe
            title={doc.nom_fichier}
            src={preview.previewSrc}
            className="absolute inset-0 h-full w-full border-0 bg-white"
          />
        ) : preview.previewKind === "image" && preview.imageSrc ? (
          <div className="flex h-full items-center justify-center overflow-auto p-4">
            <img
              src={preview.imageSrc}
              alt={doc.nom_fichier}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-sm text-muted-foreground">
            <FileText className="h-12 w-12 opacity-30" />
            <p>Aperçu indisponible pour ce type de fichier.</p>
            {preview.error ? <p className="text-xs text-destructive">{preview.error}</p> : null}
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" size="sm" onClick={() => void handleDownload()}>
                <Download className="mr-1.5 h-4 w-4" />
                Télécharger
              </Button>
              {preview.previewSrc ? (
                <Button type="button" size="sm" variant="outline" onClick={openExternal}>
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Ouvrir
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {doc.storage_path && preview.previewKind !== "none" && !preview.loading ? (
        <footer
          className={cn(
            "shrink-0 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
            preview.previewKind === "pdf" || preview.previewKind === "image" ? "hidden" : "",
          )}
        >
          <Button type="button" className="w-full" onClick={() => void handleDownload()}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger le fichier
          </Button>
        </footer>
      ) : null}
    </div>
  );
}

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCommerceAuth } from "@/hooks/useCommerceAuth";
import type { AoUploadAllowedType } from "@/lib/aoDocuments";
import {
  AO_DOCUMENT_TYPE_LABELS,
  AO_UPLOAD_ALLOWED_TYPES,
  guessAoDocumentTypeFromFileName,
  triageIncomingAoFiles,
  uploadAoDocument,
} from "@/lib/aoDocuments";
import { collectDroppedFiles } from "@/lib/collectDroppedFiles";
import { cn } from "@/lib/utils";

type PendingFile = {
  file: File;
  id: string;
  type: AoUploadAllowedType;
};

type AoImportBannerProps = {
  aoId: string;
};

export function AoImportBanner({ aoId }: AoImportBannerProps) {
  const qc = useQueryClient();
  const { user } = useCommerceAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<PendingFile[]>([]);
  const [currentFile, setCurrentFile] = useState<PendingFile | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipNotice, setSkipNotice] = useState<string | null>(null);

  const expanded = dragOver;

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["ao-documents", aoId] });
    await qc.invalidateQueries({ queryKey: ["ao-document-counts"] });
  }, [aoId, qc]);

  const flashSuccess = useCallback(() => {
    setSuccessFlash(true);
    window.setTimeout(() => setSuccessFlash(false), 600);
  }, []);

  const openManualQueue = useCallback((files: File[]) => {
    const queue: PendingFile[] = files.map((file) => ({
      file,
      id: `${Date.now()}_${file.name}`,
      type: guessAoDocumentTypeFromFileName(file.name) ?? "memoire",
    }));
    setPendingQueue(queue);
    setCurrentFile(queue[0] ?? null);
    setNotes("");
    setError(null);
    setDialogOpen(true);
    flashSuccess();
  }, [flashSuccess]);

  const uploadBatch = useCallback(
    async (items: Array<{ file: File; type: AoUploadAllowedType }>) => {
      setUploading(true);
      setError(null);
      try {
        for (const { file, type } of items) {
          await uploadAoDocument({
            aoId,
            type,
            file,
            uploadedBy: user?.id ?? null,
            uploadedByEmail: user?.email ?? null,
          });
        }
        await refresh();
        flashSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Échec du dépôt");
      } finally {
        setUploading(false);
      }
    },
    [aoId, flashSuccess, refresh, user?.email, user?.id],
  );

  const handleDroppedFiles = useCallback(
    async (files: File[]) => {
      const { accepted, skipped } = triageIncomingAoFiles(files);

      if (skipped.length > 0) {
        setSkipNotice(
          `${skipped.length} fichier${skipped.length > 1 ? "s" : ""} ignoré${skipped.length > 1 ? "s" : ""} — seuls Mémoire technique, CCTP et DPGF sont acceptés (détection par nom de fichier).`,
        );
        window.setTimeout(() => setSkipNotice(null), 8000);
      } else {
        setSkipNotice(null);
      }

      if (!accepted.length) return;

      await uploadBatch(accepted);
    },
    [uploadBatch],
  );

  function handleManualFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.size > 0);
    if (!list.length) return;
    openManualQueue(list);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = await collectDroppedFiles(e.dataTransfer);
    await handleDroppedFiles(files);
  }

  async function confirmUpload() {
    if (!currentFile) return;
    setUploading(true);
    setError(null);
    try {
      await uploadAoDocument({
        aoId,
        type: currentFile.type,
        file: currentFile.file,
        ...(notes ? { notes } : {}),
        uploadedBy: user?.id ?? null,
        uploadedByEmail: user?.email ?? null,
      });

      await refresh();

      const remaining = pendingQueue.filter((p) => p.id !== currentFile.id);
      setPendingQueue(remaining);
      if (remaining.length > 0) {
        setCurrentFile(remaining[0] ?? null);
        setNotes("");
      } else {
        setDialogOpen(false);
        setCurrentFile(null);
        flashSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du dépôt");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "relative mx-auto w-full max-w-[1920px] transition-all duration-300 ease-out",
          expanded ? "px-3 py-2 sm:px-6" : "px-3 py-1 sm:px-6",
        )}
      >
        {skipNotice ? (
          <p className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            {skipNotice}
          </p>
        ) : null}
        <div
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-all duration-300",
            expanded
              ? "min-h-[56px] border-primary bg-primary/5 px-3 py-3 sm:min-h-[72px] sm:px-4 sm:py-4"
              : "min-h-[36px] border-border/60 bg-muted/30 px-2 py-1.5 sm:min-h-[44px]",
            successFlash && "border-success bg-success/10",
            uploading && "pointer-events-none opacity-70",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => void handleDrop(e)}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleManualFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {successFlash ? (
            <CheckCircle2 className="h-5 w-5 animate-pulse text-success" />
          ) : uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <FileUp className={cn("h-5 w-5 text-muted-foreground", expanded && "text-primary")} />
          )}
          <p className={cn("text-xs font-medium sm:text-sm", expanded ? "text-foreground" : "text-muted-foreground")}>
            {successFlash
              ? "Document(s) déposé(s)"
              : expanded
                ? "Relâchez — Mémoire · CCTP · DPGF"
                : "Déposer un document"}
          </p>
          {!expanded ? (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              · Mémoire technique, CCTP, DPGF
            </span>
          ) : null}
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!uploading) {
            setDialogOpen(open);
            if (!open) {
              setPendingQueue([]);
              setCurrentFile(null);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Classer le document</DialogTitle>
            <DialogDescription>
              {currentFile ? (
                <>
                  <span className="font-medium text-foreground">{currentFile.file.name}</span>
                  {pendingQueue.length > 1 ? (
                    <span className="ml-1 text-muted-foreground">
                      ({pendingQueue.length} fichier{pendingQueue.length > 1 ? "s" : ""} en attente)
                    </span>
                  ) : null}
                </>
              ) : (
                "Choisissez le type de document."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {AO_UPLOAD_ALLOWED_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setCurrentFile((prev) => (prev ? { ...prev, type } : prev))
                  }
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    currentFile?.type === type
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "hover:bg-muted/50",
                  )}
                >
                  {AO_DOCUMENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Note (optionnel)</Label>
              <Input
                placeholder="Ex. version finale déposée le 12/03"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
              Annuler
            </Button>
            <Button onClick={() => void confirmUpload()} disabled={uploading || !currentFile}>
              {uploading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                "Déposer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
import type { AoDocumentType } from "@/lib/commerceTypes";
import { AO_DOCUMENT_TYPE_LABELS, uploadAoDocument } from "@/lib/aoDocuments";
import { cn } from "@/lib/utils";

type ClassificationChoice = "memoire" | "chiffrage" | "projet" | "annexe";

const PROJET_TYPES: AoDocumentType[] = ["dce", "rc", "cctp", "ae", "dpgf", "bpu"];

type PendingFile = {
  file: File;
  id: string;
};

type AoImportBannerProps = {
  aoId: string;
  onExcelImport?: (file: File) => void;
};

export function AoImportBanner({ aoId, onExcelImport }: AoImportBannerProps) {
  const qc = useQueryClient();
  const { user } = useCommerceAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<PendingFile[]>([]);
  const [currentFile, setCurrentFile] = useState<PendingFile | null>(null);
  const [classification, setClassification] = useState<ClassificationChoice>("projet");
  const [projetType, setProjetType] = useState<AoDocumentType>("dce");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importExcelToo, setImportExcelToo] = useState(false);

  const expanded = dragOver;

  const openClassification = useCallback((files: File[]) => {
    const queue = files.map((file) => ({ file, id: `${Date.now()}_${file.name}` }));
    setPendingQueue(queue);
    setCurrentFile(queue[0] ?? null);
    setClassification("projet");
    setProjetType("dce");
    setNotes("");
    setImportExcelToo(false);
    setError(null);
    setDialogOpen(true);
    setSuccessFlash(true);
    window.setTimeout(() => setSuccessFlash(false), 600);
  }, []);

  function handleIncomingFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.size > 0);
    if (!list.length) return;
    openClassification(list);
  }

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["ao-documents", aoId] });
    await qc.invalidateQueries({ queryKey: ["ao-document-counts"] });
  }

  function resolveDocType(): AoDocumentType {
    switch (classification) {
      case "memoire":
        return "memoire";
      case "chiffrage":
        return "reponse";
      case "annexe":
        return "annexe";
      case "projet":
      default:
        return projetType;
    }
  }

  async function confirmUpload() {
    if (!currentFile) return;
    setUploading(true);
    setError(null);
    try {
      const type = resolveDocType();
      await uploadAoDocument({
        aoId,
        type,
        file: currentFile.file,
        notes: notes || undefined,
        uploadedBy: user?.id ?? null,
        uploadedByEmail: user?.email ?? null,
      });

      const isExcel =
        currentFile.file.name.toLowerCase().endsWith(".xlsx") ||
        currentFile.file.name.toLowerCase().endsWith(".xls");

      if (classification === "chiffrage" && isExcel && importExcelToo && onExcelImport) {
        onExcelImport(currentFile.file);
      }

      await refresh();

      const remaining = pendingQueue.filter((p) => p.id !== currentFile.id);
      setPendingQueue(remaining);
      if (remaining.length > 0) {
        setCurrentFile(remaining[0] ?? null);
        setNotes("");
        setClassification("projet");
        setProjetType("dce");
        setImportExcelToo(false);
      } else {
        setDialogOpen(false);
        setCurrentFile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du dépôt");
    } finally {
      setUploading(false);
    }
  }

  const isExcelFile =
    currentFile?.file.name.toLowerCase().endsWith(".xlsx") ||
    currentFile?.file.name.toLowerCase().endsWith(".xls");

  return (
    <>
      <div
        className={cn(
          "relative mx-auto w-full max-w-[1920px] transition-all duration-300 ease-out",
          expanded ? "px-4 py-3 sm:px-6" : "px-4 py-1.5 sm:px-6",
        )}
      >
        <div
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-all duration-300",
            expanded ? "min-h-[72px] border-primary bg-primary/5 px-4 py-4" : "min-h-[44px] border-border/60 bg-muted/30 px-3 py-2",
            successFlash && "border-success bg-success/10",
            uploading && "pointer-events-none opacity-70",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleIncomingFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleIncomingFiles(e.target.files);
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
          <p className={cn("text-sm font-medium", expanded ? "text-foreground" : "text-muted-foreground")}>
            {successFlash
              ? "Fichier reçu — classification en cours…"
              : expanded
                ? "Relâchez pour déposer vos documents"
                : "Glisser-déposer des documents ici ou cliquer pour parcourir"}
          </p>
          {!expanded ? (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              · PDF, Excel, Word, images
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
                "Choisissez la catégorie de ce document."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["memoire", "Mémoire technique"],
                  ["chiffrage", "Version chiffrage"],
                  ["projet", "Documents projet"],
                  ["annexe", "Annexe"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setClassification(value)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    classification === value
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "hover:bg-muted/50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {classification === "projet" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Sous-catégorie</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={projetType}
                  onChange={(e) => setProjetType(e.target.value as AoDocumentType)}
                >
                  {PROJET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {AO_DOCUMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {classification === "chiffrage" && isExcelFile ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={importExcelToo}
                  onChange={(e) => setImportExcelToo(e.target.checked)}
                  className="rounded"
                />
                Importer aussi comme nouvelle version de chiffrage (Excel)
              </label>
            ) : null}

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
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={uploading}
            >
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

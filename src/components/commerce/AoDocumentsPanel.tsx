import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, FileUp, Loader2, Paperclip, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Panel } from "@/components/commerce/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAoDocuments } from "@/hooks/useCommerceData";
import { useCommerceAuth } from "@/hooks/useCommerceAuth";
import { supabase } from "@/integrations/supabase/client";
import type { AoDocument, AoDocumentType } from "@/lib/commerceTypes";
import {
  AO_DOCUMENT_GROUPS,
  AO_DOCUMENT_TYPE_LABELS,
  deleteAoDocument,
  downloadAoDocument,
  formatFileSize,
  uploadAoDocument,
} from "@/lib/aoDocuments";
import { cn } from "@/lib/utils";

const UPLOAD_TYPES: AoDocumentType[] = [
  "dce",
  "rc",
  "cctp",
  "ae",
  "dpgf",
  "bpu",
  "reponse",
  "memoire",
  "annexe",
  "autre",
];

export function AoDocumentsPanel({ aoId }: { aoId: string }) {
  const qc = useQueryClient();
  const { data: documents = [], isLoading } = useAoDocuments(aoId);
  const { user } = useCommerceAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docType, setDocType] = useState<AoDocumentType>("dce");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const grouped = useMemo(() => {
    return AO_DOCUMENT_GROUPS.map((group) => ({
      ...group,
      items: documents.filter((doc) => group.types.includes(doc.type)),
    }));
  }, [documents]);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["ao-documents", aoId] });
    await qc.invalidateQueries({ queryKey: ["ao-document-counts"] });
  }

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;

    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        await uploadAoDocument({
          aoId,
          type: docType,
          file,
          notes: notes || undefined,
          uploadedBy: user?.id ?? null,
          uploadedByEmail: user?.email ?? null,
        });
      }
      setNotes("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du dépôt");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownload(doc: AoDocument) {
    setBusyId(doc.id);
    setError(null);
    try {
      await downloadAoDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléchargement impossible");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(doc: AoDocument) {
    if (!window.confirm(`Supprimer « ${doc.nom_fichier} » ?`)) return;
    setBusyId(doc.id);
    setError(null);
    try {
      await deleteAoDocument(doc);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Déposer des documents"
        description="Espace partagé : chaque membre commerce autorisé peut déposer et consulter les pièces de cet appel d'offres."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Catégorie</label>
            <select
              className="h-9 min-w-[220px] rounded-md border bg-background px-2 text-sm"
              value={docType}
              onChange={(e) => setDocType(e.target.value as AoDocumentType)}
            >
              {UPLOAD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {AO_DOCUMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[220px] flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Note (optionnel)</label>
            <Input
              placeholder="Ex. version finale déposée le 12/03"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div
          className={cn(
            "mt-4 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border/70 bg-muted/20",
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
            void handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files);
            }}
          />
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <FileUp className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="mt-3 text-sm font-medium">
            Glisser-déposer ou cliquer pour choisir un ou plusieurs fichiers
          </p>
          <p className="mt-1 text-xs text-muted-foreground">PDF, Excel, Word, images — max 50 Mo</p>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </Panel>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des documents…
        </div>
      ) : (
        grouped.map((group) => (
          <Panel
            key={group.id}
            title={group.label}
            description={group.description}
            actions={
              <Badge variant="secondary" className="font-normal">
                {group.items.length} fichier{group.items.length > 1 ? "s" : ""}
              </Badge>
            }
          >
            {group.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun document dans cette catégorie.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Déposé par</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Taille</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="whitespace-nowrap text-xs font-semibold uppercase">
                        {AO_DOCUMENT_TYPE_LABELS[doc.type]}
                        {doc.version > 1 ? (
                          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                            v{doc.version}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{doc.nom_fichier}</p>
                            {doc.notes ? (
                              <p className="truncate text-xs text-muted-foreground">{doc.notes}</p>
                            ) : null}
                            {!doc.storage_path ? (
                              <p className="text-xs text-amber-700">Référence seule (pas de fichier)</p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {doc.uploaded_by_email?.split("@")[0] ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {doc.created_at
                          ? format(new Date(doc.created_at), "dd MMM yyyy HH:mm", { locale: fr })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatFileSize(doc.taille_octets)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={!doc.storage_path || busyId === doc.id}
                            onClick={() => void handleDownload(doc)}
                            title="Télécharger"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={busyId === doc.id}
                            onClick={() => void handleDelete(doc)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        ))
      )}

      <Panel title="Référence rapide (sans fichier)" bodyClassName="space-y-3">
        <p className="text-xs text-muted-foreground">
          Pour signaler un document externe (lien plateforme, DCE sur marches-publics.gouv.fr…) sans
          uploader le fichier.
        </p>
        <QuickReferenceForm aoId={aoId} onDone={refresh} />
      </Panel>
    </div>
  );
}

function QuickReferenceForm({ aoId, onDone }: { aoId: string; onDone: () => Promise<void> }) {
  const [type, setType] = useState<AoDocumentType>("dce");
  const [nom, setNom] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setSaving(true);
    try {
      await supabase.from("ao_documents").insert({
        ao_id: aoId,
        type,
        nom_fichier: nom.trim(),
        notes: note.trim() || null,
      });
      setNom("");
      setNote("");
      await onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={submit}>
      <select
        className="h-9 rounded-md border px-2 text-sm"
        value={type}
        onChange={(e) => setType(e.target.value as AoDocumentType)}
      >
        {UPLOAD_TYPES.map((t) => (
          <option key={t} value={t}>
            {AO_DOCUMENT_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <Input
        placeholder="Libellé / lien"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        className="max-w-xs flex-1"
      />
      <Textarea
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={1}
        className="max-w-xs flex-1"
      />
      <Button type="submit" size="sm" disabled={saving || !nom.trim()}>
        Ajouter
      </Button>
    </form>
  );
}

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  Search,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Panel } from "@/components/commerce/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAoDocuments } from "@/hooks/useCommerceData";
import { useAoDocumentPreview } from "@/hooks/useAoDocumentPreview";
import { supabase } from "@/integrations/supabase/client";
import type { AoDocument, AoDocumentType } from "@/lib/commerceTypes";
import {
  AO_DOCUMENT_GROUPS,
  AO_DOCUMENT_TYPE_LABELS,
  AO_UPLOAD_ALLOWED_TYPES,
  deleteAoDocument,
  downloadAoDocument,
  filterAoDocumentsByAllowedTypes,
  formatFileSize,
  isAoUploadAllowedType,
} from "@/lib/aoDocuments";
import { cn } from "@/lib/utils";

const ALL_TYPES = [...AO_UPLOAD_ALLOWED_TYPES];

function pickDefaultSelection(docs: AoDocument[], currentId: string | null): string | null {
  if (currentId && docs.some((doc) => doc.id === currentId)) return currentId;
  return null;
}

function DocumentPreviewPane({
  doc,
  preview,
}: {
  doc: AoDocument | null;
  preview: ReturnType<typeof useAoDocumentPreview>;
}) {
  const openInNewTab = () => {
    if (!preview.previewSrc) return;
    window.open(preview.previewSrc, "_blank", "noopener,noreferrer");
  };

  if (!doc) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <div>
          <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
          <p>Sélectionnez un document</p>
        </div>
      </div>
    );
  }

  if (!doc.storage_path) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <div>
          <Paperclip className="mx-auto mb-2 h-10 w-10 opacity-30" />
          <p>Référence seule — pas de fichier à prévisualiser</p>
          {doc.notes ? <p className="mt-2 text-xs">{doc.notes}</p> : null}
        </div>
      </div>
    );
  }

  if (preview.loading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (preview.previewKind === "pdf" && preview.previewSrc) {
    return (
      <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/20">
        <iframe
          title={doc.nom_fichier}
          src={preview.previewSrc}
          className="absolute inset-0 h-full w-full border-0 bg-white"
        />
      </div>
    );
  }

  if (preview.previewKind === "image" && preview.imageSrc) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        <img
          src={preview.imageSrc}
          alt={doc.nom_fichier}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
      <FileText className="h-10 w-10 opacity-30" />
      <p>Aperçu indisponible pour ce type de fichier.</p>
      {preview.error ? <p className="text-xs text-destructive">{preview.error}</p> : null}
      {preview.previewSrc ? (
        <Button type="button" size="sm" variant="outline" onClick={openInNewTab}>
          <ExternalLink className="mr-1 h-4 w-4" />
          Ouvrir le fichier
        </Button>
      ) : null}
    </div>
  );
}

function DocumentDetailsPane({
  doc,
  preview,
  busyId,
  onDownload,
  onDelete,
}: {
  doc: AoDocument | null;
  preview: ReturnType<typeof useAoDocumentPreview>;
  busyId: string | null;
  onDownload: (doc: AoDocument) => void;
  onDelete: (doc: AoDocument) => void;
}) {

  const openInNewTab = () => {
    if (!preview.previewSrc) return;
    window.open(preview.previewSrc, "_blank", "noopener,noreferrer");
  };

  if (!doc) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center p-4 text-xs text-muted-foreground">
        Détails du document
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div>
        <Badge variant="outline" className="text-[10px] font-semibold uppercase">
          {AO_DOCUMENT_TYPE_LABELS[doc.type]}
        </Badge>
        <p className="mt-2 break-words text-sm font-semibold leading-snug">{doc.nom_fichier}</p>
      </div>

      <dl className="space-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Déposé par</dt>
          <dd className="font-medium">{doc.uploaded_by_email?.split("@")[0] ?? ""}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Date</dt>
          <dd className="font-medium">
            {doc.created_at
              ? format(new Date(doc.created_at), "dd MMM yyyy HH:mm", { locale: fr })
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Taille</dt>
          <dd className="font-medium">{formatFileSize(doc.taille_octets)}</dd>
        </div>
        {doc.notes ? (
          <div>
            <dt className="text-muted-foreground">Note</dt>
            <dd className="font-medium">{doc.notes}</dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 flex-1"
          disabled={!doc.storage_path || busyId === doc.id}
          onClick={() => onDownload(doc)}
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          Télécharger
        </Button>
        {(preview.previewSrc) ? (
          <Button type="button" size="sm" variant="ghost" className="h-8" onClick={openInNewTab}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-destructive hover:text-destructive"
          disabled={busyId === doc.id}
          onClick={() => onDelete(doc)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function AoDocumentsWorkspace({ aoId }: { aoId: string }) {
  const qc = useQueryClient();
  const { data: documents = [], isLoading } = useAoDocuments(aoId);
  const allowedDocuments = useMemo(
    () => filterAoDocumentsByAllowedTypes(documents),
    [documents],
  );

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allowedDocuments.filter((doc) => {
      if (categoryFilter !== "all") {
        const group = AO_DOCUMENT_GROUPS.find((g) => g.id === categoryFilter);
        if (group && !group.types.includes(doc.type)) return false;
        if (!group && doc.type !== categoryFilter) return false;
      }
      if (!q) return true;
      return (
        doc.nom_fichier.toLowerCase().includes(q) ||
        AO_DOCUMENT_TYPE_LABELS[doc.type].toLowerCase().includes(q)
      );
    });
  }, [allowedDocuments, categoryFilter, search]);

  useEffect(() => {
    setSelectedId((current) => pickDefaultSelection(filtered, current));
  }, [filtered]);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["ao-documents", aoId] });
    await qc.invalidateQueries({ queryKey: ["ao-document-counts"] });
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
      if (selectedId === doc.id) setSelectedId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setBusyId(null);
    }
  }

  const selected = filtered.find((d) => d.id === selectedId) ?? null;
  const preview = useAoDocumentPreview(selected, Boolean(selected));

  const filtersBlock = (
    <div className="shrink-0 space-y-2 border-b p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Documents</h3>
        <Badge variant="secondary" className="font-normal">
          {allowedDocuments.length}
        </Badge>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-muted-foreground">Catégorie</label>
        <select
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Tous les types</option>
          {AO_UPLOAD_ALLOWED_TYPES.map((t) => (
            <option key={t} value={t}>
              {AO_DOCUMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>
    </div>
  );

  const listBlock = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:overflow-y-auto">
      {filtered.length === 0 ? (
        <p className="p-4 text-center text-xs text-muted-foreground">Aucun document.</p>
      ) : (
        filtered.map((doc) => {
          const isSelected = doc.id === selectedId;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedId(doc.id)}
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
                  : ""}
                {doc.taille_octets ? ` · ${formatFileSize(doc.taille_octets)}` : ""}
              </p>
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des documents…
          </div>
        ) : (
          <>
            {/* Mobile — liste verticale, aperçu en dessous */}
            <div className="flex flex-col lg:hidden">
              {filtersBlock}
              {listBlock}
              {selected ? (
                <>
                  <div className="border-t">
                    <div className="relative min-h-[220px] overflow-hidden bg-muted/20">
                      <DocumentPreviewPane doc={selected} preview={preview} />
                    </div>
                  </div>
                  <div className="border-t">
                    <DocumentDetailsPane
                      doc={selected}
                      preview={preview}
                      busyId={busyId}
                      onDownload={(d) => void handleDownload(d)}
                      onDelete={(d) => void handleDelete(d)}
                    />
                  </div>
                </>
              ) : null}
            </div>

            {/* Desktop — triptyque */}
            <div className="hidden h-[min(720px,calc(100dvh-11rem))] lg:flex lg:overflow-hidden">
              <div className="flex h-full min-h-0 w-full overflow-hidden">
                <div className="flex h-full w-[320px] shrink-0 flex-col overflow-hidden border-r">
                  {filtersBlock}
                  {listBlock}
                </div>
                <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/20">
                  <DocumentPreviewPane doc={selected} preview={preview} />
                </div>
                <div className="flex h-full w-[360px] shrink-0 flex-col overflow-y-auto overscroll-contain border-l">
                  <DocumentDetailsPane
                    doc={selected}
                    preview={preview}
                    busyId={busyId}
                    onDownload={(d) => void handleDownload(d)}
                    onDelete={(d) => void handleDelete(d)}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Panel title="Référence rapide (sans fichier)" bodyClassName="space-y-3">
        <p className="text-xs text-muted-foreground">
          Signaler un lien externe vers le mémoire technique, le CCTP ou la DPGF sans uploader le
          fichier.
        </p>
        <QuickReferenceForm aoId={aoId} onDone={refresh} />
      </Panel>
    </div>
  );
}

function QuickReferenceForm({ aoId, onDone }: { aoId: string; onDone: () => Promise<void> }) {
  const [type, setType] = useState<AoDocumentType>("cctp");
  const [nom, setNom] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    if (!isAoUploadAllowedType(type)) return;
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
        {ALL_TYPES.map((t) => (
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
      <Input
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="max-w-xs flex-1"
      />
      <Button type="submit" size="sm" disabled={saving || !nom.trim()}>
        Ajouter
      </Button>
    </form>
  );
}

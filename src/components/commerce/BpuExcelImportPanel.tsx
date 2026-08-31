import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseBpuExcelFile, type BpuExcelParseResult } from "@/lib/bpuExcelImport";
import { formatEuro } from "@/lib/bpuEngine";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";

export function BpuExcelImportPanel({
  label = "Importer un fichier Excel (.xlsx)",
  onImport,
  disabled,
}: {
  label?: string;
  onImport: (result: BpuExcelParseResult) => Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BpuExcelParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const result = await parseBpuExcelFile(file);
      if (result.rows.length === 0) {
        setError("Aucune ligne tarifaire détectée dans ce fichier.");
        setPreview(null);
        return;
      }
      setPreview(result);
    } catch (err) {
      setError((err as Error).message);
      setPreview(null);
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await onImport(preview);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const lignes = preview?.mode === "reponse" ? preview.reponseRows : preview?.catalogueRows ?? [];

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {label}
        </Button>
        {preview ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => void confirmImport()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer l'import"}
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {preview ? (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            <span>
              <strong className="text-foreground">{preview.meta.fileName}</strong> — feuille « {preview.sheetName} »
            </span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {preview.format}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">
              {preview.mode === "reponse" ? "Chiffrage (qtés)" : "Catalogue BPU"}
            </span>
            <span>{lignes.length} ligne(s)</span>
          </div>
          {preview.meta.titre ? <p className="text-xs text-muted-foreground">{preview.meta.titre}</p> : null}
          <div className="max-h-40 overflow-auto rounded border bg-background text-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-2 py-1">N°</th>
                  <th className="px-2 py-1">Désignation</th>
                  <th className="px-2 py-1">U</th>
                  {preview.mode === "reponse" ? <th className="px-2 py-1 text-right">Qté</th> : null}
                  <th className="px-2 py-1 text-right">PU HT</th>
                </tr>
              </thead>
              <tbody>
                {lignes.slice(0, 12).map((l, i) => (
                  <tr key={`${l.numero_prix}-${i}`} className="border-b border-border/40">
                    <td className="px-2 py-1 whitespace-nowrap">{l.numero_prix}</td>
                    <td className="px-2 py-1">{l.designation.slice(0, 60)}</td>
                    <td className="px-2 py-1">{l.unite ?? ""}</td>
                    {"quantite" in l && l.quantite != null ? (
                      <td className="px-2 py-1 text-right tabular-nums">{String(l.quantite)}</td>
                    ) : preview.mode === "reponse" ? (
                      <td className="px-2 py-1 text-right"></td>
                    ) : null}
                    <td className="px-2 py-1 text-right tabular-nums">{formatEuro(l.pu_ht)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

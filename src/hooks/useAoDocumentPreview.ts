import { useEffect, useMemo, useState } from "react";
import type { AoDocument } from "@/lib/commerceTypes";
import {
  blobWithMime,
  downloadAoDocumentBlob,
  getAoDocumentPreviewKind,
  type AoDocumentPreviewKind,
} from "@/lib/aoDocuments";

const STYLE_APERCU = `
  body { font: 14px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f2937;
         background: #fff; margin: 0; padding: 32px 40px; }
  h1, h2, h3, h4 { line-height: 1.3; margin: 1.4em 0 .5em; }
  table { border-collapse: collapse; margin: 1em 0; font-size: 13px; }
  td, th { border: 1px solid #d1d5db; padding: 4px 8px; vertical-align: top; }
  img { max-width: 100%; height: auto; }
  h2.feuille { font-size: 15px; margin: 1.5em 0 .5em; color: #374151; }
`;

function documentHtml(corps: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${STYLE_APERCU}</style></head><body>${corps}</body></html>`;
}

/** Word (.docx) et tableurs convertis en HTML dans le navigateur, affichés dans une iframe isolée. */
async function versHtml(blob: Blob, kind: AoDocumentPreviewKind): Promise<string> {
  const buffer = await blob.arrayBuffer();
  if (kind === "word") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.convertToHtml({ arrayBuffer: buffer });
    return documentHtml(value || "<p>Document vide.</p>");
  }
  const XLSX = await import("xlsx");
  const classeur = XLSX.read(buffer, { type: "array" });
  const feuilles = classeur.SheetNames.map((nom) => {
    const html = XLSX.utils.sheet_to_html(classeur.Sheets[nom]!, { header: "", footer: "" });
    const titre = nom.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    return `<h2 class="feuille">${titre}</h2>${html}`;
  });
  return documentHtml(feuilles.join(""));
}

export function useAoDocumentPreview(doc: AoDocument | null, enabled = true) {
  const previewKind = useMemo(
    () => (doc ? getAoDocumentPreviewKind(doc) : "none"),
    [doc],
  );

  const [loading, setLoading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [htmlDoc, setHtmlDoc] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !doc?.storage_path || previewKind === "none") {
      setPreviewSrc(null);
      setHtmlDoc(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      setPreviewSrc(null);
      setHtmlDoc(null);
      setError(null);

      try {
        const blob = blobWithMime(await downloadAoDocumentBlob(doc), doc);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewSrc(objectUrl);
        if (previewKind === "word" || previewKind === "sheet") {
          const html = await versHtml(blob, previewKind);
          if (!cancelled) setHtmlDoc(html);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Aperçu indisponible.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [enabled, doc?.id, doc?.storage_path, doc?.mime_type, doc?.nom_fichier, previewKind]);

  const imageSrc = previewKind === "image" ? previewSrc : null;

  return {
    loading,
    previewSrc,
    previewKind: previewKind as AoDocumentPreviewKind,
    imageSrc,
    /** Document HTML complet (Word / tableur) à afficher dans une iframe `srcDoc` sandboxée. */
    htmlDoc,
    error,
    // Aliases kept for consumers that distinguish the iframe viewer / external open URL.
    viewerSrc: previewSrc,
    signedUrl: previewSrc,
  };
}

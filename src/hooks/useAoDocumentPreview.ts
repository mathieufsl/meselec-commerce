import { useEffect, useMemo, useState } from "react";
import type { AoDocument } from "@/lib/commerceTypes";
import {
  blobWithMime,
  downloadAoDocumentBlob,
  getAoDocumentPreviewKind,
  type AoDocumentPreviewKind,
} from "@/lib/aoDocuments";

export function useAoDocumentPreview(doc: AoDocument | null, enabled = true) {
  const previewKind = useMemo(
    () => (doc ? getAoDocumentPreviewKind(doc) : "none"),
    [doc],
  );

  const [loading, setLoading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !doc?.storage_path || previewKind === "none") {
      setPreviewSrc(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      setPreviewSrc(null);
      setError(null);

      try {
        const blob = blobWithMime(await downloadAoDocumentBlob(doc), doc);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewSrc(objectUrl);
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
    error,
  };
}

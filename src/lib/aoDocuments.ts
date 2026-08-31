import { supabase } from "@/integrations/supabase/client";
import type { AoDocument, AoDocumentType } from "@/lib/commerceTypes";

export const AO_DOCUMENTS_BUCKET = "ao-documents";

/** Seuls ces types peuvent être déposés sur un AO (évite d'alourdir le dossier). */
export const AO_UPLOAD_ALLOWED_TYPES = ["memoire", "cctp", "dpgf"] as const satisfies readonly AoDocumentType[];

export type AoUploadAllowedType = (typeof AO_UPLOAD_ALLOWED_TYPES)[number];

export function isAoUploadAllowedType(type: AoDocumentType): type is AoUploadAllowedType {
  return (AO_UPLOAD_ALLOWED_TYPES as readonly string[]).includes(type);
}

/** Détection heuristique à partir du nom de fichier (dépôt dossier / glisser-déposer). */
export function guessAoDocumentTypeFromFileName(fileName: string): AoUploadAllowedType | null {
  const n = fileName.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  if (/cctp/i.test(n)) return "cctp";
  if (/dpgf/i.test(n)) return "dpgf";
  if (/memoire/i.test(n) || /memo[\s._-]tech/i.test(n)) return "memoire";

  return null;
}

export function triageIncomingAoFiles(files: File[]): {
  accepted: Array<{ file: File; type: AoUploadAllowedType }>;
  skipped: File[];
} {
  const accepted: Array<{ file: File; type: AoUploadAllowedType }> = [];
  const skipped: File[] = [];

  for (const file of files) {
    if (file.size <= 0) continue;
    const type = guessAoDocumentTypeFromFileName(file.name);
    if (type) accepted.push({ file, type });
    else skipped.push(file);
  }

  return { accepted, skipped };
}

export function filterAoDocumentsByAllowedTypes(docs: AoDocument[]): AoDocument[] {
  return docs.filter((doc) => isAoUploadAllowedType(doc.type));
}

export const AO_DOCUMENT_TYPE_LABELS: Record<AoDocumentType, string> = {
  dce: "DCE",
  rc: "Règlement de consultation",
  cctp: "CCTP",
  ae: "Acte d'engagement",
  dpgf: "DPGF",
  bpu: "BPU",
  memoire: "Mémoire technique",
  reponse: "Notre réponse",
  annexe: "Annexe",
  autre: "Autre",
};

export const AO_DOCUMENT_GROUPS: Array<{
  id: string;
  label: string;
  description: string;
  types: AoDocumentType[];
}> = [
  {
    id: "memoire",
    label: "Mémoire technique",
    description: "Mémoire technique de réponse.",
    types: ["memoire"],
  },
  {
    id: "cctp",
    label: "CCTP",
    description: "Cahier des clauses techniques particulières.",
    types: ["cctp"],
  },
  {
    id: "dpgf",
    label: "DPGF",
    description: "Décomposition du prix global et forfaitaire.",
    types: ["dpgf"],
  },
];

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildAoDocumentStoragePath(
  aoId: string,
  type: AoDocumentType,
  fileName: string,
): string {
  return `${aoId}/${type}/${Date.now()}_${sanitizeFileName(fileName)}`;
}

export async function nextAoDocumentVersion(aoId: string, fileName: string): Promise<number> {
  const { data } = await supabase
    .from("ao_documents")
    .select("version")
    .eq("ao_id", aoId)
    .eq("nom_fichier", fileName)
    .order("version", { ascending: false })
    .limit(1);
  return ((data?.[0]?.version as number | undefined) ?? 0) + 1;
}

export async function uploadAoDocument(params: {
  aoId: string;
  type: AoDocumentType;
  file: File;
  notes?: string;
  uploadedBy?: string | null;
  uploadedByEmail?: string | null;
}): Promise<AoDocument> {
  const { aoId, type, file, notes, uploadedBy, uploadedByEmail } = params;
  if (!isAoUploadAllowedType(type)) {
    throw new Error(
      "Type de document non autorisé. Seuls le mémoire technique, le CCTP et la DPGF peuvent être déposés.",
    );
  }
  const storagePath = buildAoDocumentStoragePath(aoId, type, file.name);
  const version = await nextAoDocumentVersion(aoId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(AO_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      ...(file.type ? { contentType: file.type } : {}),
    });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("ao_documents")
    .insert({
      ao_id: aoId,
      type,
      nom_fichier: file.name,
      storage_path: storagePath,
      fichier_url: storagePath,
      taille_octets: file.size,
      mime_type: file.type || null,
      version,
      notes: notes?.trim() || null,
      uploaded_by: uploadedBy ?? null,
      uploaded_by_email: uploadedByEmail ?? null,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(AO_DOCUMENTS_BUCKET).remove([storagePath]);
    throw error;
  }

  return data as AoDocument;
}

export type AoDocumentPreviewKind = "pdf" | "image" | "none";

const EXTENSION_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
};

/** Les imports OneDrive stockent souvent application/octet-stream — on déduit le vrai type. */
export function inferAoDocumentMime(doc: AoDocument): string | null {
  const stored = doc.mime_type?.trim().toLowerCase() ?? "";
  if (stored && stored !== "application/octet-stream") return stored;

  const match = doc.nom_fichier.toLowerCase().match(/\.[a-z0-9]+$/);
  const ext = match?.[0];
  if (ext && EXTENSION_MIME[ext]) return EXTENSION_MIME[ext];

  return stored || null;
}

export function getAoDocumentPreviewKind(doc: AoDocument): AoDocumentPreviewKind {
  if (!doc.storage_path) return "none";
  const mime = inferAoDocumentMime(doc) ?? "";
  const name = doc.nom_fichier.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) {
    return "image";
  }
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  return "none";
}

export async function getAoDocumentSignedUrl(
  doc: AoDocument,
  ttlSeconds = 300,
  options?: { download?: string | boolean },
): Promise<string> {
  if (!doc.storage_path) {
    throw new Error("Ce document n'a pas de fichier associé.");
  }
  const { data, error } = await supabase.storage
    .from(AO_DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, ttlSeconds, {
      download: options?.download ?? false,
    });
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Lien de téléchargement indisponible.");
  return data.signedUrl;
}

/** Télécharge le blob via le client authentifié (évite les soucis CORS / iframe). */
export async function downloadAoDocumentBlob(doc: AoDocument): Promise<Blob> {
  if (!doc.storage_path) {
    throw new Error("Ce document n'a pas de fichier associé.");
  }
  const { data, error } = await supabase.storage
    .from(AO_DOCUMENTS_BUCKET)
    .download(doc.storage_path);
  if (error) throw error;
  if (!data) throw new Error("Fichier introuvable dans le stockage.");
  return data;
}

export function blobWithMime(blob: Blob, doc: AoDocument): Blob {
  const mime = inferAoDocumentMime(doc);
  if (!mime) return blob;
  if (blob.type === mime) return blob;
  return new Blob([blob], { type: mime });
}

export async function downloadAoDocument(doc: AoDocument): Promise<void> {
  const blob = blobWithMime(await downloadAoDocumentBlob(doc), doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = doc.nom_fichier || "document";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function deleteAoDocument(doc: AoDocument): Promise<void> {
  if (doc.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(AO_DOCUMENTS_BUCKET)
      .remove([doc.storage_path]);
    if (storageError) throw storageError;
  }
  const { error } = await supabase.from("ao_documents").delete().eq("id", doc.id);
  if (error) throw error;
}

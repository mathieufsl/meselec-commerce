import { supabase } from "@/integrations/supabase/client";
import type { AoDocument, AoDocumentType } from "@/lib/commerceTypes";

export const AO_DOCUMENTS_BUCKET = "ao-documents";

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
    id: "dce",
    label: "Documents AO (DCE)",
    description: "Pièces du dossier de consultation émises par le donneur d'ordre.",
    types: ["dce", "rc", "cctp", "ae", "dpgf", "bpu"],
  },
  {
    id: "reponse",
    label: "Notre réponse",
    description: "Offre déposée, chiffrage exporté, mémoire et pièces de réponse.",
    types: ["reponse", "memoire", "annexe"],
  },
  {
    id: "autre",
    label: "Autres pièces",
    description: "Échanges, compléments, notes internes partagées.",
    types: ["autre"],
  },
];

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
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
  const storagePath = buildAoDocumentStoragePath(aoId, type, file.name);
  const version = await nextAoDocumentVersion(aoId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(AO_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || undefined,
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

export async function downloadAoDocument(doc: AoDocument): Promise<void> {
  if (!doc.storage_path) {
    throw new Error("Ce document n'a pas de fichier associé.");
  }
  const { data, error } = await supabase.storage
    .from(AO_DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, 120);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Lien de téléchargement indisponible.");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
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

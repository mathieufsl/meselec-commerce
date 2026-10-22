import type { AppelOffre } from "@/lib/commerceTypes";
import { extractAoAnnonceUrl } from "@/lib/aoNotes";

/**
 * URL de l'annonce du marché : champ « Lien de l'annonce », sinon URL trouvée dans les notes
 * (import veille), sinon avis BOAMP déduit de la référence.
 */
export function aoAnnonceUrl(
  ao: Pick<AppelOffre, "reference" | "notes"> & { annonce_url?: string | null },
): string | null {
  const direct = ao.annonce_url?.trim();
  if (direct) return direct;
  const fromNotes = extractAoAnnonceUrl(ao.notes);
  if (fromNotes) return fromNotes;
  const boamp = ao.reference.trim().match(/^BOAMP-(\d{2}-\d+)$/i);
  if (boamp) return `https://www.boamp.fr/avis/detail/${boamp[1]}`;
  return null;
}

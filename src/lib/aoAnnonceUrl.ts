import type { AppelOffre } from "@/lib/commerceTypes";

const URL_RE = /https?:\/\/[^\s<>"')]+/;

function trimPunctuation(url: string) {
  return url.replace(/[.,;:!?]+$/, "");
}

/**
 * URL de l'annonce du marché : ligne « Annonce : … » des notes (import veille),
 * sinon première URL des notes, sinon avis BOAMP déduit de la référence.
 */
export function aoAnnonceUrl(ao: Pick<AppelOffre, "reference" | "notes">): string | null {
  const notes = ao.notes ?? "";
  const annonce = notes.match(/Annonce\s*:\s*(https?:\/\/[^\s<>"')]+)/i);
  if (annonce) return trimPunctuation(annonce[1]!);
  const any = notes.match(URL_RE);
  if (any) return trimPunctuation(any[0]);
  const boamp = ao.reference.trim().match(/^BOAMP-(\d{2}-\d+)$/i);
  if (boamp) return `https://www.boamp.fr/avis/detail/${boamp[1]}`;
  return null;
}

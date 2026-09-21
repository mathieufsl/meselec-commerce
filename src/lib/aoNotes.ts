/** Extrait l'URL d'annonce (import veille) depuis les notes AO. */
export function extractAoAnnonceUrl(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;

  const labeled = notes.match(/Annonce\s*:\s*(https?:\/\/\S+)/i);
  if (labeled?.[1]) return stripTrailingPunctuation(labeled[1]);

  const any = notes.match(/https?:\/\/[^\s<>"']+/i);
  return any?.[0] ? stripTrailingPunctuation(any[0]) : null;
}

function stripTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:)\]}>]+$/g, "");
}

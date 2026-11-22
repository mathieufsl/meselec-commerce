/**
 * Un même AO peut arriver par plusieurs sources (BOAMP, Maximilien, PLACE, ajout
 * par lien). Avant d'en créer une annonce, on cherche si la veille l'a déjà :
 * 1. même numéro de consultation dans un lien (DCE, avis) ;
 * 2. même date limite et même intitulé (ou l'un contenu dans l'autre).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { sansAccents } from "@/lib/veille";

/** Numéros de consultation lisibles dans un lien de plateforme (Atexo, AWS…). */
export function numerosConsultation(...urls: Array<string | null | undefined>): string[] {
  const out = new Set<string>();
  for (const u of urls) {
    if (!u) continue;
    for (const m of u.matchAll(/(?:consultation\/|[?&](?:id|refConsultation|Idm|IDM)=)(\d{5,})/g)) {
      if (m[1]) out.add(m[1]);
    }
  }
  return [...out];
}

export function titreNormalise(t: string | null | undefined): string {
  return sansAccents(t ?? "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function memeTitre(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = titreNormalise(a);
  const y = titreNormalise(b);
  if (x.length < 15 || y.length < 15) return x === y && x.length > 0;
  return x === y || x.includes(y) || y.includes(x);
}

export type CandidatDoublon = {
  source: string;
  source_id: string;
  intitule: string;
  date_limite: string | null;
  liens: Array<string | null | undefined>;
};

/** Identifiant de l'annonce déjà présente pour le même AO, sinon null. */
export async function trouverDoublon(
  client: SupabaseClient,
  c: CandidatDoublon,
): Promise<string | null> {
  const autre = (r: { source: string; source_id: string }) =>
    !(r.source === c.source && r.source_id === c.source_id);

  for (const num of numerosConsultation(...c.liens)) {
    const { data } = await client
      .from("veille_annonces")
      .select("id, source, source_id, lien, url_dce, dce_url")
      .or(
        `source_id.ilike.%-${num},url_dce.ilike.%${num}%,dce_url.ilike.%${num}%,lien.ilike.%${num}%`,
      )
      .limit(20);
    const trouve = (data ?? []).find(
      (r) =>
        autre(r) &&
        (r.source_id.endsWith(`-${num}`) ||
          numerosConsultation(r.lien, r.url_dce, r.dce_url).includes(num)),
    );
    if (trouve) return trouve.id as string;
  }

  if (c.date_limite) {
    const { data } = await client
      .from("veille_annonces")
      .select("id, source, source_id, intitule")
      .eq("date_limite", c.date_limite)
      .limit(300);
    const trouve = (data ?? []).find((r) => autre(r) && memeTitre(r.intitule, c.intitule));
    if (trouve) return trouve.id as string;
  }
  return null;
}

/**
 * Lecture des pages de résultats des plateformes Atexo (Maximilien, PLACE…) :
 * une consultation par bloc `tableauResultSearch_ctlN`. Fonctions pures, testées
 * sur des pages enregistrées (voir veilleAtexo.test.ts).
 */

export type ConsultationAtexo = {
  /** Numéro interne de la consultation sur la plateforme. */
  id: string;
  /** Acronyme de l'organisme (paramètre orgAcronyme). */
  org: string;
  reference: string | null;
  intitule: string;
  objet: string | null;
  organisme: string | null;
  /** Codes département du lieu d'exécution, ex. ["75", "92"]. */
  departements: string[];
  procedure: string | null;
  categorie: string | null;
  date_parution: string | null;
  date_limite: string | null;
  lien: string;
};

const MOIS: Record<string, string> = {
  janvier: "01",
  fevrier: "02",
  mars: "03",
  avril: "04",
  mai: "05",
  juin: "06",
  juillet: "07",
  aout: "08",
  septembre: "09",
  octobre: "10",
  novembre: "11",
  decembre: "12",
};

export function texteBrut(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function sansAccents(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Bloc « jour / mois / année » d'Atexo → AAAA-MM-JJ. */
function dateBloc(fragment: string): string | null {
  const jour = fragment.match(/class="day[^"]*">\s*<span>\s*(\d{1,2})\s*</)?.[1];
  const mois = fragment.match(/class="month">\s*<span>\s*([^<\s]+)\s*</)?.[1];
  const annee = fragment.match(/class="year">\s*<span>\s*(\d{4})\s*</)?.[1];
  // Mois complet (« Mars ») ou abrégé (« Nov. », « Déc. », « Janv. »).
  const abrege = mois ? sansAccents(mois).replace(/\./g, "") : "";
  const m = abrege
    ? (MOIS[abrege] ?? Object.entries(MOIS).find(([nom]) => nom.startsWith(abrege))?.[1])
    : undefined;
  if (!jour || !m || !annee) return null;
  return `${annee}-${m}-${jour.padStart(2, "0")}`;
}

/** Codes département « (75) Paris, (92) Hauts-de-Seine » → ["75", "92"]. */
export function departementsDepuisTexte(texte: string): string[] {
  return [...new Set([...texte.matchAll(/\((\d{2,3}|2[AB])\)/g)].map((m) => m[1] as string))];
}

/** Nombre total de résultats annoncé par la page. */
export function totalResultats(html: string): number | null {
  const m = texteBrut(html).match(/Nombre de r[ée]sultats\s*:\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

export function lireResultatsAtexo(html: string, base: string): ConsultationAtexo[] {
  const debuts = [...html.matchAll(/tableauResultSearch_(ctl\d+)_refCons" value="(\d+)"/g)];
  const out: ConsultationAtexo[] = [];
  for (const [i, m] of debuts.entries()) {
    const bloc = html.slice(m.index ?? 0, debuts[i + 1]?.index ?? html.length);
    const id = m[2] as string;
    const org = bloc.match(/_orgCons" value="([^"]+)"/)?.[1] ?? "";
    const intitule = texteBrut(
      bloc.match(/REFERENCE \| INTITULE[\s\S]*?truncate">\s*<span[^>]*title="([^"]*)"/)?.[1] ?? "",
    );
    const reference = texteBrut(
      bloc.match(
        /REFERENCE \| INTITULE -->\s*<div[^>]*>\s*<div class="small pull-left">([\s\S]*?)<\/div>/,
      )?.[1] ?? "",
    );
    const objet = texteBrut(bloc.match(/panelBlocObjet[\s\S]*?title="([^"]*)"/)?.[1] ?? "");
    const organisme = texteBrut(
      bloc.match(/panelBlocDenomination[\s\S]*?title="([^"]*)"/)?.[1] ?? "",
    );
    const lieuxBloc = bloc.match(/panelBlocLieuxExec[\s\S]*?<\/div>/)?.[0] ?? "";
    const lieuxComplets = lieuxBloc.match(/data-content="([^"]*)"/)?.[1] ?? texteBrut(lieuxBloc);
    let departements = departementsDepuisTexte(lieuxComplets);
    if (departements.length === 0) {
      // À défaut, le code postal de l'organisme : « Ville de Clichy (92100 - Clichy) ».
      const cp = organisme.match(/\((97\d|\d{2})\d{2,3}\s*-/)?.[1];
      if (cp) departements = [cp];
    }
    const procedure = texteBrut(
      bloc.match(/cons_procedure">[\s\S]*?<span>([^<]*)<\/span>/)?.[1] ?? "",
    );
    const categorie = texteBrut(
      bloc.match(/panelBlocCategorie" class="cons_categorie">\s*<span>([^<]*)</)?.[1] ?? "",
    );
    const parution = dateBloc(
      bloc.match(/class="date date-min clearfix">[\s\S]*?class="year">[\s\S]*?<\/div>/)?.[0] ?? "",
    );
    const limite = dateBloc(
      bloc.match(/class="cloture-line">[\s\S]*?class="year">[\s\S]*?<\/div>/)?.[0] ?? "",
    );
    const titre = intitule || objet;
    if (!titre) continue;
    out.push({
      id,
      org,
      reference: reference || null,
      intitule: titre,
      objet: objet || null,
      organisme: organisme || null,
      departements,
      procedure: procedure || null,
      categorie: categorie || null,
      date_parution: parution,
      date_limite: limite,
      lien: `${base}/entreprise/consultation/${id}?orgAcronyme=${org}`,
    });
  }
  return out;
}

/** Champs utiles de la page de détail d'une consultation (texte, CPV). */
export function lireDetailAtexo(html: string): { texte: string; cpv: string[] } {
  const corps = html
    .replace(/<(script|style|noscript|svg|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n");
  const texte = texteBrut(corps.replace(/\n/g, " ¶ ")).replace(/(\s*¶\s*)+/g, "\n");
  // Le cœur de la fiche : de « Référence » jusqu'aux documents.
  const debut = texte.search(/R[ée]f[ée]rence\s*:/);
  const utile = (debut >= 0 ? texte.slice(debut) : texte).slice(0, 20_000);
  const cpv = [
    ...new Set(
      [...utile.matchAll(/CPV\s*:?\s*([\d\s,;()a-zA-Z-]{8,200})/g)].flatMap((m) =>
        [...(m[1] ?? "").matchAll(/\b(\d{8})\b/g)].map((c) => c[1] as string),
      ),
    ),
  ];
  return { texte: utile, cpv };
}

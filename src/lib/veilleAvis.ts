/**
 * Outils purs pour lire le contenu complet d'un avis BOAMP (champ `donnees`
 * du record opendatasoft) : CPV, URLs, plateforme de dématérialisation et
 * texte lisible à transmettre à la qualification IA.
 */

export type VeillePlateforme =
  | "PLACE"
  | "Maximilien"
  | "AWS"
  | "achatpublic"
  | "SIAAP"
  | "autre"
  | "inconnue";

export const VEILLE_PLATEFORMES: VeillePlateforme[] = [
  "PLACE",
  "Maximilien",
  "AWS",
  "achatpublic",
  "SIAAP",
  "autre",
  "inconnue",
];

/** `donnees` arrive sérialisé en JSON (parfois déjà objet) : renvoie l'objet ou null. */
export function parseDonnees(donnees: unknown): unknown {
  if (donnees == null) return null;
  if (typeof donnees === "string") {
    try {
      return JSON.parse(donnees);
    } catch {
      return donnees;
    }
  }
  return donnees;
}

/** Codes CPV (8 chiffres) présents dans l'avis : `codeCPV`, `ItemClassificationCode`… */
export function extraireCpv(donnees: unknown): string[] {
  const found = new Set<string>();
  const visit = (node: unknown, dansCpv: boolean) => {
    if (node == null) return;
    if (typeof node === "string" || typeof node === "number") {
      if (dansCpv) for (const m of String(node).match(/\b\d{8}\b/g) ?? []) found.add(m);
      return;
    }
    if (Array.isArray(node)) {
      for (const n of node) visit(n, dansCpv);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const estCpv = dansCpv || String(obj["@listName"] ?? "").toLowerCase() === "cpv";
      for (const [k, v] of Object.entries(obj)) {
        visit(v, estCpv || /cpv|classificationcode/i.test(k));
      }
    }
  };
  visit(parseDonnees(donnees), false);
  return [...found];
}

/** Toutes les URLs http(s) de l'avis, `&amp;` décodé, sans ponctuation finale. */
export function extraireUrls(donnees: unknown): string[] {
  const brut = typeof donnees === "string" ? donnees : JSON.stringify(donnees ?? "");
  const urls = new Set<string>();
  for (const m of brut.match(/https?:\/\/[^\s"'<>\\]+/gi) ?? []) {
    const url = m.replace(/&amp;/g, "&").replace(/[.,;:)\]]+$/, "");
    urls.add(url);
  }
  return [...urls];
}

const PLATEFORMES: Array<{ re: RegExp; plateforme: VeillePlateforme }> = [
  { re: /(^|\.)marches-publics\.gouv\.fr$/i, plateforme: "PLACE" },
  { re: /(^|\.)marches\.maximilien\.fr$/i, plateforme: "Maximilien" },
  { re: /(^|\.)marches-publics\.info$/i, plateforme: "AWS" },
  { re: /(^|\.)achatpublic\.com$/i, plateforme: "achatpublic" },
  { re: /(^|\.)marchespublics\.siaap\.fr$/i, plateforme: "SIAAP" },
];

/** Sites qui ne sont jamais un profil acheteur (outils, annuaires, textes de loi…). */
const HOTES_IGNORES =
  /(^|\.)(boamp\.fr|dume\.chorus-pro\.gouv\.fr|chorus-pro\.gouv\.fr|legifrance\.gouv\.fr|ted\.europa\.eu|europa\.eu|economie\.gouv\.fr|service-public\.fr|w3\.org|xmlsoap\.org)$/i;

function hote(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Score de spécificité : une URL qui pointe vers une consultation précise l'emporte. */
function specificite(url: string): number {
  let s = 0;
  if (/IDM=\d+/i.test(url)) s += 10;
  if (/consultation\/\d+|refConsult|[?&](id|reference|ref)=\w+|\/\d{4,}/i.test(url)) s += 8;
  if (/dce/i.test(url)) s += 3;
  try {
    const u = new URL(url);
    if (u.pathname.length > 1) s += 1;
    if (u.search) s += 1;
  } catch {
    /* ignore */
  }
  return s;
}

/**
 * Détermine la plateforme et l'URL du DCE à partir des URLs de l'avis
 * (en code, sans IA). Préfère l'URL la plus spécifique d'une plateforme connue.
 */
export function detecterPlateforme(urls: string[]): {
  plateforme: VeillePlateforme;
  dce_url: string | null;
} {
  const candidates: Array<{ url: string; plateforme: VeillePlateforme; score: number }> = [];
  for (const raw of urls) {
    const url = raw.replace(/&amp;/g, "&");
    const h = hote(url);
    if (!h || HOTES_IGNORES.test(h)) continue;
    const connue = PLATEFORMES.find((p) => p.re.test(h));
    candidates.push({
      url,
      plateforme: connue?.plateforme ?? "autre",
      score: specificite(url) + (connue ? 100 : 0),
    });
  }
  if (candidates.length === 0) return { plateforme: "inconnue", dce_url: null };
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0]!;
  // Un profil « autre » sans aucune spécificité est souvent le site web de l'acheteur :
  // on le garde comme lien, faute de mieux.
  return { plateforme: best.plateforme, dce_url: best.url };
}

/** Clés techniques sans intérêt pour la lecture de l'avis. */
const CLES_IGNOREES =
  /^(@|xmlns|xsi|ext:UBLExtensions$|cbc:UBLVersionID|cbc:CustomizationID|cbc:ProfileID|cbc:ID$|cac:PartyIdentification|cac:PartyLegalEntity|cbc:CompanyID|cbc:CountrySubentityCode|cac:Country$|typeIdentificationNational|codeIdentificationNational|efbc:ChangedNoticeIdentifier|efac:NoticeSubType)/i;

function libelleCle(cle: string): string {
  return cle
    .replace(/^(cac|cbc|efac|efbc|efext|ext):/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

/**
 * Aplati `donnees` en texte lisible (« clé : valeur » par ligne), sans balises
 * ni clés techniques, tronqué à `maxChars`.
 */
export function aplatirDonnees(donnees: unknown, maxChars = 40000): string {
  const lignes: string[] = [];
  let total = 0;
  const push = (ligne: string) => {
    if (total > maxChars) return;
    lignes.push(ligne);
    total += ligne.length + 1;
  };

  const visit = (node: unknown, chemin: string) => {
    if (total > maxChars || node == null) return;
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
      const txt = String(node)
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/[ \t]+/g, " ")
        .trim();
      if (txt) push(chemin ? `${chemin} : ${txt}` : txt);
      else if (chemin) push(chemin); // clé-drapeau, ex. { "oui": "" }
      return;
    }
    if (Array.isArray(node)) {
      for (const n of node) visit(n, chemin);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if ("#text" in obj) {
        visit(obj["#text"], chemin);
        return;
      }
      for (const [k, v] of Object.entries(obj)) {
        if (CLES_IGNOREES.test(k)) continue;
        const lib = libelleCle(k);
        visit(v, chemin ? `${chemin.split(" › ").slice(-1)[0]} › ${lib}` : lib);
      }
    }
  };

  visit(parseDonnees(donnees), "");
  const texte = lignes.join("\n");
  return texte.length > maxChars ? `${texte.slice(0, maxChars)}\n[…tronqué]` : texte;
}

import { sansAccents } from "@/lib/veille";

/**
 * Lecture de l'avis BOAMP complet (champ `donnees`, JSON de l'avis au format
 * historique ou eForms) : adresse des documents du marché (DCE), plateforme
 * acheteur, et premiers indices sur la visite et les certifications demandées.
 *
 * Les chemins JSON varient selon le formulaire : on parcourt donc tout l'arbre
 * plutôt que de viser des clés précises.
 */

export type VeillePlateforme =
  | "PLACE"
  | "Maximilien"
  | "AWS"
  | "achatpublic"
  | "marches-securises"
  | "SIAAP"
  | "autre"
  | "inconnue";

export const PLATEFORMES_GEREES: VeillePlateforme[] = [
  "PLACE",
  "Maximilien",
  "AWS",
  "achatpublic",
  "marches-securises",
];

export const PLATEFORME_LABELS: Record<VeillePlateforme, string> = {
  PLACE: "PLACE",
  Maximilien: "Maximilien",
  AWS: "AWS-achat",
  achatpublic: "achatpublic",
  "marches-securises": "marches-securises",
  SIAAP: "SIAAP",
  autre: "Autre plateforme",
  inconnue: "Inconnue",
};

const HOTES_PLATEFORMES: Array<{ motif: RegExp; plateforme: VeillePlateforme }> = [
  { motif: /(^|\.)marches-publics\.gouv\.fr$/, plateforme: "PLACE" },
  { motif: /(^|\.)maximilien\.fr$/, plateforme: "Maximilien" },
  { motif: /(^|\.)marches-publics\.info$/, plateforme: "AWS" },
  { motif: /(^|\.)achatpublic\.com$/, plateforme: "achatpublic" },
  { motif: /(^|\.)marches-securises\.fr$/, plateforme: "marches-securises" },
  // Profil acheteur du SIAAP : reconnu, mais pas de connexion automatique.
  { motif: /(^|\.)marchespublics\.siaap\.fr$/, plateforme: "SIAAP" },
];

/** Autres profils acheteurs reconnus (pas de connexion automatique pour l'instant). */
const HOTES_AUTRES_PROFILS = [
  /e-marchespublics\.com$/,
  /klekoon\.com$/,
  /megalis\.bretagne\.bzh$/,
  /achats-hopitaux\.com$/,
  /marchespublics\./,
  /ternum-bfc\.fr$/,
  /centraledesmarches\.com$/,
  /synapse-entreprises\.com$/,
  /dematis\.com$/,
  /xmarches\.fr$/,
  /marches\.[a-z-]+\.fr$/,
  /atexo/,
];

/** Hôtes jamais retenus comme adresse du DCE (journaux, réglementation…). */
const HOTES_EXCLUS = [
  /boamp\.fr$/,
  /europa\.eu$/,
  /legifrance\.gouv\.fr$/,
  /economie\.gouv\.fr$/,
  /w3\.org$/,
  /oasis-open\.org$/,
];

export type VeilleIndicesAvis = {
  visite: {
    mentionnee: boolean;
    obligatoire: boolean | null;
    extrait: string | null;
  };
  certifications: string[];
  extraits_certifications: string[];
};

export type VeilleAvisLu = {
  url_dce: string | null;
  plateforme: VeillePlateforme | null;
  indices: VeilleIndicesAvis;
  /** Texte brut de l'avis (toutes les valeurs texte), utile pour l'analyse IA. */
  texte: string;
};

type Feuille = { chemin: string; valeur: string };

function feuilles(noeud: unknown, chemin = "", acc: Feuille[] = []): Feuille[] {
  if (noeud == null) return acc;
  if (typeof noeud === "string" || typeof noeud === "number" || typeof noeud === "boolean") {
    const valeur = String(noeud).trim();
    if (valeur) acc.push({ chemin, valeur });
    return acc;
  }
  if (Array.isArray(noeud)) {
    noeud.forEach((n, i) => feuilles(n, `${chemin}[${i}]`, acc));
    return acc;
  }
  if (typeof noeud === "object") {
    for (const [cle, val] of Object.entries(noeud as Record<string, unknown>)) {
      feuilles(val, chemin ? `${chemin}.${cle}` : cle, acc);
    }
  }
  return acc;
}

/** `donnees` est une chaîne JSON dans l'API Opendatasoft ; on accepte aussi un objet. */
export function parseDonnees(donnees: unknown): unknown {
  if (typeof donnees !== "string") return donnees ?? null;
  try {
    return JSON.parse(donnees) as unknown;
  } catch {
    return donnees;
  }
}

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s"'<>()\]\\]+/gi;

function nettoyerUrl(brute: string): string | null {
  let url = brute.replace(/[.,;:]+$/, "");
  if (/^www\./i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function hote(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function plateformeDepuisUrl(url: string): VeillePlateforme | null {
  const h = hote(url);
  if (!h) return null;
  for (const { motif, plateforme } of HOTES_PLATEFORMES) if (motif.test(h)) return plateforme;
  if (HOTES_AUTRES_PROFILS.some((m) => m.test(h))) return "autre";
  return null;
}

const CLE_DOCUMENT_RE =
  /(doc|dce|calltenders|callfortenders|profil|consult|telecharg|uri|url_document|adresse_document)/i;

/** Choisit l'adresse la plus probable des documents du marché. */
export function choisirUrlDce(
  liste: Feuille[],
): { url: string; plateforme: VeillePlateforme | null } | null {
  type Candidat = { url: string; score: number; plateforme: VeillePlateforme | null };
  const candidats: Candidat[] = [];
  for (const f of liste) {
    for (const brute of f.valeur.match(URL_RE) ?? []) {
      const url = nettoyerUrl(brute);
      if (!url) continue;
      const h = hote(url);
      if (!h || HOTES_EXCLUS.some((m) => m.test(h))) continue;
      const plateforme = plateformeDepuisUrl(url);
      let score = 0;
      if (plateforme && plateforme !== "autre") score += 10;
      else if (plateforme === "autre") score += 6;
      if (CLE_DOCUMENT_RE.test(f.chemin)) score += 4;
      // Une URL pointant sur une consultation précise vaut mieux que la page d'accueil.
      if (/consultation|refconsult|id=|\/\d{4,}/i.test(url)) score += 2;
      candidats.push({ url, score, plateforme });
    }
  }
  candidats.sort((a, b) => b.score - a.score);
  const meilleur = candidats[0];
  if (!meilleur || meilleur.score < 4) return null;
  return { url: meilleur.url, plateforme: meilleur.plateforme };
}

const CERTIFICATIONS: Array<{ label: string; motif: RegExp }> = [
  { label: "Qualifelec", motif: /qualifelec/ },
  { label: "Qualibat", motif: /qualibat/ },
  { label: "FNTP", motif: /\bfntp\b|qualification(s)? (des )?travaux publics/ },
  { label: "ISO 9001", motif: /iso\s*9001/ },
  { label: "ISO 14001", motif: /iso\s*14001/ },
  { label: "ISO 45001", motif: /iso\s*45001|ohsas\s*18001/ },
  { label: "ISO 50001", motif: /iso\s*50001/ },
  { label: "MASE", motif: /\bmase\b/ },
  { label: "RGE", motif: /\brge\b/ },
  { label: "AIPR", motif: /\baipr\b/ },
  { label: "Habilitation électrique", motif: /habilitation(s)? electrique/ },
  { label: "CACES", motif: /\bcaces\b/ },
  { label: "Certificat amiante (SS3/SS4)", motif: /sous[- ]section\s*(3|4)|\bss\s*[34]\b/ },
];

const CERTIF_CONTEXTE_RE = /(certificat|certification|qualification|habilitation|label)/;

function extraitAutour(texte: string, index: number, longueur = 220): string {
  const debut = Math.max(0, index - 80);
  const fin = Math.min(texte.length, index + longueur);
  return `${debut > 0 ? "…" : ""}${texte.slice(debut, fin).replace(/\s+/g, " ").trim()}${
    fin < texte.length ? "…" : ""
  }`;
}

export function indicesDepuisTexte(texteBrut: string): VeilleIndicesAvis {
  const texte = sansAccents(texteBrut);

  const visiteRe =
    /visite(s)?\s+(obligatoire|des\s+lieux|de\s+site|sur\s+site|prealable|du\s+site|des\s+sites|technique)/g;
  const visiteMatch = visiteRe.exec(texte);
  let obligatoire: boolean | null = null;
  if (visiteMatch) {
    const fenetre = texte.slice(Math.max(0, visiteMatch.index - 120), visiteMatch.index + 200);
    if (
      /(visite[^.]{0,80}(est |sera |reste )?facultative|facultative[^.]{0,40}visite)/.test(fenetre)
    )
      obligatoire = false;
    else if (/(visite[^.]{0,80}obligatoire|obligatoire[^.]{0,40}visite)/.test(fenetre))
      obligatoire = true;
  }

  const certifications = CERTIFICATIONS.filter((c) => c.motif.test(texte)).map((c) => c.label);

  const extraits: string[] = [];
  const ctxRe = new RegExp(CERTIF_CONTEXTE_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = ctxRe.exec(texte)) !== null && extraits.length < 3) {
    const ex = extraitAutour(texteBrut, m.index);
    if (!extraits.some((e) => e === ex)) extraits.push(ex);
    ctxRe.lastIndex = m.index + 200;
  }

  return {
    visite: {
      mentionnee: Boolean(visiteMatch),
      obligatoire,
      extrait: visiteMatch ? extraitAutour(texteBrut, visiteMatch.index) : null,
    },
    certifications,
    extraits_certifications: extraits,
  };
}

/** Lit l'avis complet d'un enregistrement BOAMP (Opendatasoft). */
export function lireAvis(record: Record<string, unknown>): VeilleAvisLu {
  const donnees = parseDonnees(record["donnees"]);
  const liste = feuilles(donnees);
  // Champs plats de l'enregistrement (url_avis, objet…) en complément.
  for (const [cle, val] of Object.entries(record)) {
    if (cle === "donnees" || cle === "gestion") continue;
    feuilles(val, cle, liste);
  }

  const texte = liste
    .map((f) => f.valeur)
    .filter((v) => !/^[\d\s.:/T+-]+$/.test(v))
    .join("\n");
  const dce = choisirUrlDce(liste);
  return {
    url_dce: dce?.url ?? null,
    plateforme: dce?.plateforme ?? null,
    indices: indicesDepuisTexte(texte),
    texte,
  };
}

// ---------------------------------------------------------------------------
// Outils utilisés par la qualification IA (CPV, URLs, plateforme, texte lisible)
// ---------------------------------------------------------------------------

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

/**
 * Intitulés des lots de l'avis (eForms et formulaire simplifié). Un marché
 * « tous corps d'état » cache souvent son lot électricité dans la liste des lots,
 * pas dans l'intitulé général.
 */
export function intitulesLots(donnees: unknown): string[] {
  const out: string[] = [];
  for (const f of feuilles(parseDonnees(donnees))) {
    const c = f.chemin;
    const eforms = /ProcurementProjectLot.*ProcurementProject\.cbc:Name/.test(c) && !/@/.test(c);
    const fns = /\blots\b.*\blot\b.*\.(description|intitule|intituleLot|objet)$/i.test(c);
    if (eforms || fns) out.push(f.valeur.slice(0, 300));
  }
  return [...new Set(out)];
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

/** Sites qui ne sont jamais un profil acheteur (outils, annuaires, textes de loi…). */
const HOTES_IGNORES =
  /(^|\.)(dume\.chorus-pro\.gouv\.fr|chorus-pro\.gouv\.fr|ted\.europa\.eu|service-public\.fr|xmlsoap\.org)$/i;

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
    if (!h || HOTES_IGNORES.test(h) || HOTES_EXCLUS.some((m) => m.test(h))) continue;
    const connue = plateformeDepuisUrl(url);
    const estConnue = connue != null && connue !== "autre";
    candidates.push({
      url,
      plateforme: estConnue ? connue : "autre",
      score: specificite(url) + (estConnue ? 100 : 0),
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

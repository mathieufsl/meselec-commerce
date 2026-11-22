/**
 * Ajout manuel d'un AO trouvé ailleurs que dans la collecte BOAMP : on part du
 * lien de l'avis, on lit la page et on en tire une annonce de veille qui suit
 * ensuite le parcours habituel (qualification IA, robot DCE, envoi vers les AO).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { domainesDetectes, secteursFromDomaines } from "@/lib/veille";
import { indicesDepuisTexte, plateformeDepuisUrl } from "@/lib/veilleAvis";
import { DEFAULT_QUALIF_MODEL } from "@/lib/veilleQualif";

const API_URL = "https://api.anthropic.com/v1/messages";
const MAX_OCTETS_PAGE = 3 * 1024 * 1024;
const MAX_CARACTERES_TEXTE = 40_000;

export type ResultatAjout =
  | { ok: true; id: string; deja: boolean; intitule: string; analyseIa: boolean }
  | { ok: false; error: string };

/** Refuse les adresses locales ou privées : la page est lue par le serveur. */
function adresseAutorisee(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const h = url.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":")) return false;
  return h.includes(".");
}

/** Numéro d'avis BOAMP dans un lien boamp.fr (ex. /avis/detail/26-112013). */
function idwebBoamp(url: URL): string | null {
  if (!/(^|\.)boamp\.fr$/i.test(url.hostname)) return null;
  return url.href.match(/\b(\d{2}-\d{4,})\b/)?.[1] ?? null;
}

function texteDeLaPage(html: string): { titre: string; texte: string } {
  const titre = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const texte = html
    .replace(/<(script|style|noscript|svg|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return { titre: titre.replace(/\s+/g, " "), texte: texte.slice(0, MAX_CARACTERES_TEXTE) };
}

type Extraction = {
  intitule: string | null;
  acheteur: string | null;
  departement: string | null;
  date_parution: string | null;
  date_limite: string | null;
  cpv: string[];
  url_dce: string | null;
};

const OUTIL_EXTRACTION = {
  name: "avis_extrait",
  description: "Enregistre les informations clés de l'avis d'appel d'offres.",
  input_schema: {
    type: "object",
    properties: {
      intitule: { type: ["string", "null"], description: "Objet du marché, tel qu'écrit." },
      acheteur: { type: ["string", "null"], description: "Nom de l'acheteur public." },
      departement: {
        type: ["string", "null"],
        description: "Code(s) département du lieu d'exécution, ex. « 78 » ou « 75 92 ».",
      },
      date_parution: { type: ["string", "null"], description: "AAAA-MM-JJ" },
      date_limite: {
        type: ["string", "null"],
        description: "Date limite de remise des offres, AAAA-MM-JJ",
      },
      cpv: { type: "array", items: { type: "string" }, description: "Codes CPV à 8 chiffres" },
      url_dce: {
        type: ["string", "null"],
        description: "Lien de la consultation / des documents (DCE) s'il figure dans l'avis.",
      },
    },
    required: [
      "intitule",
      "acheteur",
      "departement",
      "date_parution",
      "date_limite",
      "cpv",
      "url_dce",
    ],
  },
} as const;

async function extraireAvecClaude(texte: string, apiKey: string): Promise<Extraction | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env["QUALIF_MODEL"]?.trim() || DEFAULT_QUALIF_MODEL,
        max_tokens: 1000,
        system:
          "Tu lis le texte d'une page web contenant un avis d'appel d'offres public français et tu en extrais les informations demandées. N'invente rien : null si absent. Dates au format AAAA-MM-JJ.",
        tools: [OUTIL_EXTRACTION],
        tool_choice: { type: "tool", name: OUTIL_EXTRACTION.name },
        messages: [{ role: "user", content: texte }],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: Array<{ type: string; input?: unknown }> };
    const bloc = json.content?.find((c) => c.type === "tool_use");
    return (bloc?.input as Extraction | undefined) ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Lecture sans IA des informations les plus courantes d'un avis (secours). */
export function extraireSansIa(texte: string): Extraction {
  const ligne = (re: RegExp) => texte.match(re)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  const intitule = ligne(
    /\bObjet(?:\s+(?:du\s+march[ée]|de\s+l'accord-cadre|accord-cadre|de\s+la\s+consultation))?\s*:?\s*\n?\s*([^\n]{10,300})/i,
  );
  const cpv = new Set<string>();
  for (const m of texte.matchAll(/CPV/gi)) {
    const zone = texte.slice(m.index ?? 0, (m.index ?? 0) + 300);
    for (const c of zone.matchAll(/\b(\d{8})(?:-\d)?\b/g)) if (c[1]) cpv.add(c[1]);
  }
  const cp = texte.match(/\b(9[78]\d|\d{2})\d{3}\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ' -]{2,}/)?.[1] ?? null;
  const limite = texte.match(
    /(?:date\s+limite|remise\s+des\s+offres|r[ée]ception\s+des\s+offres)[\s\S]{0,160}?(\d{2})\/(\d{2})\/(\d{4}|\d{2})\b/i,
  );
  return {
    intitule,
    acheteur: null,
    departement: cp ? (cp.length === 3 ? cp : cp.slice(0, 2)) : null,
    date_parution: null,
    date_limite: limite
      ? `${limite[3]?.length === 2 ? `20${limite[3]}` : limite[3]}-${limite[2]}-${limite[1]}`
      : null,
    cpv: [...cpv],
    url_dce: null,
  };
}

function dateIso(v: string | null | undefined): string | null {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export async function ajouterAnnonceParLien(
  client: SupabaseClient,
  lien: string,
): Promise<ResultatAjout> {
  let url: URL;
  try {
    url = new URL(lien.trim());
  } catch {
    return { ok: false, error: "Lien invalide." };
  }
  if (!adresseAutorisee(url)) return { ok: false, error: "Adresse non autorisée." };

  // Lien BOAMP : on récupère l'avis complet par l'API, comme la collecte.
  const idweb = idwebBoamp(url);
  if (idweb) {
    const { fetchBoampRecord, normaliser } = await import("@/lib/veilleCollect.server");
    const record = await fetchBoampRecord(idweb);
    const a = record ? normaliser(record) : null;
    if (a) {
      const { data, error } = await client
        .from("veille_annonces")
        .upsert(
          {
            source: a.source,
            source_id: a.source_id,
            intitule: a.intitule,
            acheteur: a.acheteur,
            cpv: a.cpv,
            departement: a.departement,
            date_parution: a.date_parution,
            date_limite: a.date_limite,
            lien: a.lien,
            domaines: a.domaines,
            secteurs: a.secteurs,
            url_dce: a.url_dce ?? null,
            plateforme: a.plateforme ?? null,
            avis_indices: a.avis_indices ?? {},
            raw: a.raw,
          },
          { onConflict: "source,source_id", ignoreDuplicates: true },
        )
        .select("id");
      if (error) return { ok: false, error: error.message };
      if (data?.[0])
        return { ok: true, id: data[0].id, deja: false, intitule: a.intitule, analyseIa: true };
      const { data: existe } = await client
        .from("veille_annonces")
        .select("id")
        .eq("source", a.source)
        .eq("source_id", a.source_id)
        .maybeSingle();
      if (existe)
        return { ok: true, id: existe.id, deja: true, intitule: a.intitule, analyseIa: true };
    }
  }

  // Autre site : lecture de la page de l'avis.
  const sourceId = url.href.slice(0, 500);
  const { data: existe } = await client
    .from("veille_annonces")
    .select("id, intitule")
    .eq("source", "MANUEL")
    .eq("source_id", sourceId)
    .maybeSingle();
  if (existe)
    return { ok: true, id: existe.id, deja: true, intitule: existe.intitule, analyseIa: true };

  let html: string;
  try {
    const res = await fetch(url.href, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "rms-commerce-veille/1.0",
      },
    });
    if (!res.ok) return { ok: false, error: `La page a répondu ${res.status}.` };
    const taille = Number(res.headers.get("content-length") ?? 0);
    if (taille > MAX_OCTETS_PAGE) return { ok: false, error: "Page trop volumineuse." };
    html = (await res.text()).slice(0, MAX_OCTETS_PAGE);
  } catch (e) {
    return {
      ok: false,
      error: `Page illisible : ${e instanceof Error ? e.message : "erreur réseau"}`,
    };
  }

  const { titre, texte } = texteDeLaPage(html);
  if (texte.length < 200) {
    return {
      ok: false,
      error:
        "La page ne contient pas de texte lisible (connexion requise ?). Déposez l'avis à la main.",
    };
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  const ia = apiKey ? await extraireAvecClaude(texte, apiKey) : null;
  const secours = extraireSansIa(texte);
  const ext: Extraction = {
    intitule: ia?.intitule || secours.intitule,
    acheteur: ia?.acheteur || secours.acheteur,
    departement: ia?.departement || secours.departement,
    date_parution: dateIso(ia?.date_parution) ?? secours.date_parution,
    date_limite: dateIso(ia?.date_limite) ?? secours.date_limite,
    cpv: ia?.cpv?.length ? ia.cpv : secours.cpv,
    url_dce: ia?.url_dce ?? null,
  };
  const intitule = (ext?.intitule || titre || url.hostname).slice(0, 500);
  const cpv = (ext?.cpv ?? []).filter((c) => /^\d{8}/.test(c)).join(" ") || null;
  const domaines = domainesDetectes(cpv ?? "", `${intitule} ${texte.slice(0, 3000)}`);
  const urlDce = ext?.url_dce && /^https?:\/\//.test(ext.url_dce) ? ext.url_dce : url.href;

  const { trouverDoublon } = await import("@/lib/veilleDoublons.server");
  const doublon = await trouverDoublon(client, {
    source: "MANUEL",
    source_id: sourceId,
    intitule,
    date_limite: dateIso(ext?.date_limite),
    liens: [url.href, urlDce],
  });
  if (doublon) return { ok: true, id: doublon, deja: true, intitule, analyseIa: ia != null };

  const { data, error } = await client
    .from("veille_annonces")
    .insert({
      source: "MANUEL",
      source_id: sourceId,
      intitule,
      acheteur: ext?.acheteur ?? null,
      cpv,
      departement: ext?.departement ?? null,
      date_parution: dateIso(ext?.date_parution) ?? new Date().toISOString().slice(0, 10),
      date_limite: dateIso(ext?.date_limite),
      lien: url.href,
      domaines,
      secteurs: secteursFromDomaines(domaines),
      url_dce: urlDce,
      plateforme: plateformeDepuisUrl(urlDce) ?? plateformeDepuisUrl(url.href),
      avis_indices: indicesDepuisTexte(texte),
      // `donnees` : lu par la qualification IA et le résumé, comme un avis BOAMP.
      raw: { donnees: { "Avis (page web)": texte }, url: url.href, titre },
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id, deja: false, intitule, analyseIa: ia != null };
}

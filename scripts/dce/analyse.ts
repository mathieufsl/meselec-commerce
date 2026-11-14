/**
 * Analyse IA des pièces du DCE (RC, CCTP…) : visite, certifications et autres
 * exigences de candidature. Sortie structurée (schéma JSON) via l'API Claude.
 */
import { readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { VEILLE_ANALYSE_JSON_SCHEMA, type VeilleAnalyse } from "../../src/lib/veilleAnalyse";
import { texteDePiece, texteSuffisant, type TypePiece } from "./fichiers";

const MODELE = process.env["VEILLE_DCE_MODEL"] || "claude-opus-5-5";
/** Au-delà, le texte d'une pièce est coupé (et c'est signalé à l'IA et dans l'analyse). */
const MAX_CARACTERES_PIECE = 250_000;
const MAX_OCTETS_PDF = 20 * 1024 * 1024;

const SYSTEME = `Tu assistes le service commercial de Meselec, entreprise d'électricité (éclairage public, illuminations, réseaux électriques, CFO, VRD) qui répond aux marchés publics en Île-de-France.

On te donne l'avis de publication d'un appel d'offres et, quand ils ont pu être récupérés, des pièces du dossier de consultation (règlement de la consultation, CCTP, éventuellement CCAP). Relève précisément ce qui conditionne la décision de répondre :

- Visite : obligatoire, facultative ou non mentionnée ; dates/créneaux, modalités (prise de rendez-vous, contact, lieu, attestation à joindre). Une visite seulement « conseillée » ou « recommandée » compte comme facultative.
- Certifications et qualifications demandées aux candidats (Qualifelec, Qualibat, FNTP, ISO, MASE, habilitations électriques, AIPR, CACES…), en distinguant : exigée, acceptée « ou équivalent », ou simplement appréciée. Garde les codes précis (ex. Qualifelec EP3, FNTP 5131).
- Autres exigences de candidature notables : chiffre d'affaires minimum, références, assurances, moyens, échantillons, etc.
- La date limite pour poser des questions si elle est donnée.

Pour chaque élément, indique la source (pièce et article/page si possible). N'invente rien : si une information est absente, dis-le (visite « non_mentionnee », liste vide). Le résumé fait 2 à 4 phrases et les points d'attention signalent ce qui pourrait écarter Meselec ou demander une action rapide. Réponds en français.`;

type PieceLue = { chemin: string; type: TypePiece };

const LIBELLES: Record<TypePiece, string> = {
  rc: "Règlement de la consultation",
  cctp: "CCTP",
  ccap: "CCAP",
  visite: "Document visite",
  ae: "Acte d'engagement",
  bpu: "BPU",
  dpgf: "DPGF",
  dqe: "DQE",
  plan: "Plan",
  autre: "Autre pièce",
};

export async function analyserAnnonce(params: {
  client: Anthropic;
  intitule: string;
  acheteur: string | null;
  texteAvis: string;
  pieces: PieceLue[];
  fichiersDce: string[];
}): Promise<VeilleAnalyse> {
  const { client, intitule, acheteur, texteAvis, pieces, fichiersDce } = params;
  const contenu: Anthropic.Beta.BetaContentBlockParam[] = [];
  const documentsAnalyses: string[] = [];

  for (const piece of pieces) {
    const nom = basename(piece.chemin);
    const titre = `${LIBELLES[piece.type]} — ${nom}`;
    const octets = statSync(piece.chemin).size;
    const texte = texteDePiece(piece.chemin);

    if (texteSuffisant(texte, octets)) {
      const coupe = texte.length > MAX_CARACTERES_PIECE;
      contenu.push({
        type: "text",
        text: `<piece titre="${titre}"${coupe ? ' tronquee="oui"' : ""}>\n${texte.slice(0, MAX_CARACTERES_PIECE)}\n</piece>`,
      });
      documentsAnalyses.push(coupe ? `${nom} (début seulement)` : nom);
    } else if (extname(piece.chemin).toLowerCase() === ".pdf" && octets <= MAX_OCTETS_PDF) {
      // PDF scanné : on le transmet tel quel, Claude lit les pages.
      contenu.push({
        type: "document",
        title: titre,
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: readFileSync(piece.chemin).toString("base64"),
        },
      });
      documentsAnalyses.push(`${nom} (scanné)`);
    } else {
      console.warn(`    ! ${nom} ignoré (format non lisible ou trop lourd)`);
    }
  }

  contenu.push({
    type: "text",
    text: [
      `Appel d'offres : ${intitule}`,
      acheteur ? `Acheteur : ${acheteur}` : null,
      fichiersDce.length
        ? `Fichiers présents dans le DCE : ${fichiersDce.slice(0, 80).join(", ")}`
        : "Le DCE n'a pas pu être récupéré : analyse sur l'avis seul.",
      `<avis>\n${texteAvis.slice(0, 60_000)}\n</avis>`,
      "Remplis l'analyse demandée.",
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  const flux = client.beta.messages.stream({
    model: MODELE,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEME,
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: VEILLE_ANALYSE_JSON_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [{ role: "user", content: contenu }],
  });
  const message = await flux.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("Analyse refusée par le modèle");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Analyse interrompue (réponse trop longue)");
  }
  const texte = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const analyse = JSON.parse(texte) as VeilleAnalyse;
  analyse.documents_analyses = documentsAnalyses;
  console.log(
    `    analyse : ${message.usage.input_tokens} jetons en entrée, ${message.usage.output_tokens} en sortie`,
  );
  return analyse;
}

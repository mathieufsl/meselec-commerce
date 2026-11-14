import { z } from "zod";

/** Partie pure (testable) de la qualification IA des annonces de veille. */

export type VeilleEntite = "MESELEC" | "MESTP" | "aucune";
export type VeilleDecision = "hors_sujet" | "a_creuser" | "prioritaire";
export type VeilleQualifStatut = "a_qualifier" | "qualifie" | "erreur";

export const VEILLE_DECISION_LABELS: Record<VeilleDecision, string> = {
  prioritaire: "Prioritaire",
  a_creuser: "À creuser",
  hors_sujet: "Hors sujet",
};

export const DEFAULT_QUALIF_MODEL = "claude-haiku-5-5";
export const QUALIF_TOOL_NAME = "enregistrer_qualification";

export interface QualificationProfil {
  id?: string;
  entite: string;
  actif: boolean;
  metiers: string[];
  hors_perimetre: string[];
  departements: string[];
  certifications_detenues: string[];
  certifications_manquantes: string[];
  montant_min: number | null;
  montant_max: number | null;
  regles: string;
  updated_at?: string;
}

const nullableString = z.string().nullable().optional().transform((v) => v ?? null);

export const exigencesSchema = z.object({
  certifications: z.array(z.string()).default([]),
  chiffre_affaires_min: nullableString,
  references: nullableString,
  visite_obligatoire: z.boolean().nullable().optional().transform((v) => v ?? null),
  date_visite: nullableString,
  montant_estime: nullableString,
  duree: nullableString,
  allotissement: nullableString,
  criteres_attribution: z
    .array(z.object({ critere: z.string(), ponderation: nullableString }))
    .default([]),
  avis_insuffisant: z.boolean().default(false),
});

export const qualificationSchema = z.object({
  entite: z.enum(["MESELEC", "MESTP", "aucune"]),
  decision: z.enum(["hors_sujet", "a_creuser", "prioritaire"]),
  score: z.number().int().min(0).max(100),
  type_marche: z.enum(["travaux", "fourniture", "services", "maintenance", "mixte"]),
  resume: z.string(),
  raisons: z.array(z.string()).default([]),
  points_rouges: z.array(z.string()).default([]),
  certif_manquante: z.boolean(),
  interet_relationnel: z.boolean(),
  exigences: exigencesSchema,
});

export type Qualification = z.infer<typeof qualificationSchema>;
export type VeilleExigences = z.infer<typeof exigencesSchema>;

const strOrNull = { type: ["string", "null"] };

/** Schéma JSON du tool (sortie structurée forcée). */
export const QUALIF_TOOL = {
  name: QUALIF_TOOL_NAME,
  description: "Enregistre la qualification structurée de l'avis de marché public.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "entite",
      "decision",
      "score",
      "type_marche",
      "resume",
      "raisons",
      "points_rouges",
      "certif_manquante",
      "interet_relationnel",
      "exigences",
    ],
    properties: {
      entite: { type: "string", enum: ["MESELEC", "MESTP", "aucune"] },
      decision: { type: "string", enum: ["hors_sujet", "a_creuser", "prioritaire"] },
      score: { type: "integer", description: "0 à 100" },
      type_marche: {
        type: "string",
        enum: ["travaux", "fourniture", "services", "maintenance", "mixte"],
      },
      resume: { type: "string", description: "2 lignes maximum, factuel" },
      raisons: { type: "array", items: { type: "string" } },
      points_rouges: { type: "array", items: { type: "string" } },
      certif_manquante: { type: "boolean" },
      interet_relationnel: { type: "boolean" },
      exigences: {
        type: "object",
        additionalProperties: false,
        required: [
          "certifications",
          "chiffre_affaires_min",
          "references",
          "visite_obligatoire",
          "date_visite",
          "montant_estime",
          "duree",
          "allotissement",
          "criteres_attribution",
          "avis_insuffisant",
        ],
        properties: {
          certifications: { type: "array", items: { type: "string" } },
          chiffre_affaires_min: strOrNull,
          references: strOrNull,
          visite_obligatoire: { type: ["boolean", "null"] },
          date_visite: strOrNull,
          montant_estime: strOrNull,
          duree: strOrNull,
          allotissement: strOrNull,
          criteres_attribution: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["critere", "ponderation"],
              properties: { critere: { type: "string" }, ponderation: strOrNull },
            },
          },
          avis_insuffisant: { type: "boolean" },
        },
      },
    },
  },
} as const;

function liste(items: string[]): string {
  return items.length ? items.join(" ; ") : "(aucune)";
}

export function serialiserProfils(profils: QualificationProfil[]): string {
  return profils
    .map((p) =>
      [
        `## ${p.entite}`,
        `Métiers : ${liste(p.metiers)}`,
        `Hors périmètre : ${liste(p.hors_perimetre)}`,
        `Départements (zone) : ${liste(p.departements)}`,
        `Certifications détenues : ${liste(p.certifications_detenues)}`,
        `Certifications manquantes : ${liste(p.certifications_manquantes)}`,
        `Montant min : ${p.montant_min ?? "aucun"} · Montant max : ${p.montant_max ?? "aucun"}`,
        p.regles.trim() ? `Règles :\n${p.regles.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

export function buildSystemPrompt(profils: QualificationProfil[]): string {
  return `Tu qualifies des avis de marchés publics pour le Groupe RMS, qui a deux entités :

${serialiserProfils(profils)}

Pour l'avis fourni :
- Choisis l'entité la plus pertinente (MESELEC, MESTP ou aucune).
- decision : hors_sujet | a_creuser | prioritaire.
  prioritaire = métier cœur, dans la zone, aucune exigence bloquante visible.
- score 0-100 : adéquation métier (50), zone (15), faisabilité/exigences (20), taille/intérêt (15).
- Extrais UNIQUEMENT ce qui est écrit dans l'avis ; n'invente rien. Si une info est absente, mets null.
- resume : 2 lignes maximum, factuel.
- raisons : 2 à 4 puces courtes justifiant la décision.
- points_rouges : exigences ou clauses risquées (certifs, CA mini, références, délais courts, pénalités, visite obligatoire).
- Indique si l'avis est trop pauvre pour décider (exigences.avis_insuffisant=true) : il faudra alors lire le RC.

Réponds uniquement en appelant l'outil ${QUALIF_TOOL_NAME}.`;
}

export interface AnnonceAQualifier {
  intitule: string;
  acheteur: string | null;
  cpv: string | null;
  departement: string | null;
  date_limite: string | null;
  texteAvis: string;
}

export function buildUserMessage(a: AnnonceAQualifier): string {
  return [
    `Intitulé : ${a.intitule}`,
    `Acheteur : ${a.acheteur ?? "—"}`,
    `CPV : ${a.cpv ?? "—"}`,
    `Département(s) : ${a.departement ?? "—"}`,
    `Date limite : ${a.date_limite ?? "—"}`,
    "",
    "Texte de l'avis :",
    a.texteAvis || "(texte complet indisponible)",
  ].join("\n");
}

export interface QualifUsage {
  input_tokens: number;
  output_tokens: number;
}

/**
 * Extrait et valide la sortie du tool depuis la réponse brute de l'API Messages.
 * Lève une erreur explicite si la réponse est inexploitable.
 */
export function parseQualificationResponse(json: unknown): {
  qualification: Qualification;
  usage: QualifUsage | null;
} {
  const res = json as {
    stop_reason?: string;
    content?: Array<{ type: string; name?: string; input?: unknown }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  if (res.stop_reason === "refusal") throw new Error("Le modèle a refusé de qualifier l'avis.");
  if (res.stop_reason === "max_tokens") throw new Error("Réponse tronquée (max_tokens).");
  const bloc = res.content?.find((b) => b.type === "tool_use" && b.name === QUALIF_TOOL_NAME);
  if (!bloc) throw new Error("Réponse sans appel à l'outil de qualification.");
  const parsed = qualificationSchema.safeParse(bloc.input);
  if (!parsed.success) {
    throw new Error(`Sortie invalide : ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`);
  }
  const q = parsed.data;
  // Règle métier : certification manquante → score plafonné à 60, jamais « prioritaire ».
  if (q.certif_manquante) {
    q.score = Math.min(q.score, 60);
    if (q.decision === "prioritaire") q.decision = "a_creuser";
  }
  const usage = res.usage
    ? { input_tokens: res.usage.input_tokens ?? 0, output_tokens: res.usage.output_tokens ?? 0 }
    : null;
  return { qualification: q, usage };
}

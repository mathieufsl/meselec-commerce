/** Résumé IA lisible d'un avis BOAMP (panneau détail de la Veille). */

export type AvisResumeSection = { titre: string; points: string[] };

export type AvisResume = {
  en_bref: string;
  sections: AvisResumeSection[];
};

export const RESUME_TOOL_NAME = "resume_avis";

export const RESUME_TOOL = {
  name: RESUME_TOOL_NAME,
  description: "Enregistre le résumé structuré de l'avis d'appel d'offres.",
  input_schema: {
    type: "object",
    properties: {
      en_bref: {
        type: "string",
        description: "Une à deux phrases : qui achète quoi, où, sous quelle forme.",
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            titre: { type: "string" },
            points: { type: "array", items: { type: "string" } },
          },
          required: ["titre", "points"],
        },
      },
    },
    required: ["en_bref", "sections"],
  },
} as const;

export const RESUME_SYSTEM = `Tu résumes des avis d'appels d'offres publics (BOAMP, formats historique et eForms) pour une entreprise de travaux (éclairage public, réseaux électriques, CFO, VRD).
Réponds en français, de façon factuelle et concise, sans rien inventer : si une information n'est pas dans l'avis, ne la mentionne pas.
Traduis les codes techniques eForms en langage clair (ex. « works » → travaux, « not-allowed » → non autorisées, « price » → prix).
Sections à produire, dans cet ordre, en omettant celles qui sont vides :
- « Objet et prestations » : ce qui est demandé, périmètre, lieu d'exécution.
- « Forme du marché » : procédure, accord-cadre / bons de commande, allotissement (liste des lots), tranches, variantes, durée, reconduction, montant estimé ou maximum.
- « Dates clés » : date limite de remise des offres, visite (obligatoire ou non, date), questions, démarrage.
- « Critères d'attribution » : critères et pondérations.
- « Conditions de participation » : capacités, CA, références, assurances, certifications, groupement, sous-traitance.
- « Modalités » : prix (forfaitaires, unitaires, révisables), paiement, avance, garanties, retenue.
- « Rectificatif » : uniquement si l'avis est un rectificatif, ce qui change.
- « Accès au DCE » : plateforme et adresse.
Chaque point fait une ligne courte. Pas plus de 6 points par section.`;

export function parseResumeResponse(body: unknown): AvisResume {
  const content = (body as { content?: Array<{ type: string; name?: string; input?: unknown }> })
    ?.content;
  const tool = content?.find((c) => c.type === "tool_use" && c.name === RESUME_TOOL_NAME);
  const input = tool?.input as Partial<AvisResume> | undefined;
  if (!input || typeof input.en_bref !== "string" || !Array.isArray(input.sections)) {
    throw new Error("Réponse IA inattendue (résumé absent).");
  }
  return {
    en_bref: input.en_bref.trim(),
    sections: input.sections
      .filter((s) => s && typeof s.titre === "string" && Array.isArray(s.points))
      .map((s) => ({
        titre: s.titre.trim(),
        points: s.points.filter((p): p is string => typeof p === "string" && p.trim() !== ""),
      }))
      .filter((s) => s.points.length > 0),
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { aplatirDonnees } from "@/lib/veilleAvis";
import { DEFAULT_QUALIF_MODEL } from "@/lib/veilleQualif";
import {
  parseResumeResponse,
  RESUME_SYSTEM,
  RESUME_TOOL,
  RESUME_TOOL_NAME,
  type AvisResume,
} from "@/lib/veilleResume";

const API_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 90_000;

/** Les champs plats utiles de l'enregistrement BOAMP, en complément de `donnees`. */
const CHAMPS_PLATS = [
  "objet",
  "nomacheteur",
  "nature_libelle",
  "type_marche",
  "procedure_libelle",
  "descripteur_libelle",
  "dateparution",
  "datelimitereponse",
  "code_departement",
  "url_avis",
];

export async function resumerAvis(
  client: SupabaseClient,
  id: string,
  force = false,
): Promise<{ ok: true; resume: AvisResume } | { ok: false; error: string }> {
  const { data, error } = await client
    .from("veille_annonces")
    .select("id, intitule, acheteur, raw, avis_resume")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Annonce introuvable." };
  const row = data as {
    intitule: string;
    acheteur: string | null;
    raw: Record<string, unknown> | null;
    avis_resume: AvisResume | null;
  };
  if (row.avis_resume && !force) return { ok: true, resume: row.avis_resume };

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return { ok: false, error: "Clé ANTHROPIC_API_KEY absente côté serveur." };

  const raw = row.raw ?? {};
  const plats = CHAMPS_PLATS.map((k) => {
    const v = raw[k];
    if (v == null || v === "") return null;
    return `${k} : ${Array.isArray(v) ? v.join(", ") : String(v)}`;
  }).filter(Boolean);
  const texte = raw["donnees"] ? aplatirDonnees(raw["donnees"], 40000) : "";
  if (!texte && plats.length === 0) return { ok: false, error: "Texte de l'avis indisponible." };

  const user = `Intitulé : ${row.intitule}\nAcheteur : ${row.acheteur ?? "—"}\n\n${plats.join("\n")}\n\n--- Avis complet ---\n${texte}`;
  const model = process.env["QUALIF_MODEL"]?.trim() || DEFAULT_QUALIF_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let resume: AvisResume;
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
        model,
        max_tokens: 3000,
        thinking: { type: "disabled" },
        system: RESUME_SYSTEM,
        tools: [RESUME_TOOL],
        tool_choice: { type: "tool", name: RESUME_TOOL_NAME },
        messages: [{ role: "user", content: user }],
      }),
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, error: `API Anthropic ${res.status} : ${body.slice(0, 300)}` };
    resume = parseResumeResponse(JSON.parse(body));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec du résumé IA" };
  } finally {
    clearTimeout(timer);
  }

  await client
    .from("veille_annonces")
    .update({ avis_resume: resume, avis_resume_at: new Date().toISOString() } as never)
    .eq("id", id);
  return { ok: true, resume };
}

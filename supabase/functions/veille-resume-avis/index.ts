// Résumé IA de l'avis BOAMP d'une annonce de veille (panneau détail).
// Tourne dans Supabase pour utiliser le secret ANTHROPIC_API_KEY des Edge Functions.
// Le résumé est mis en cache dans veille_annonces.avis_resume.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  parseResumeResponse,
  RESUME_SYSTEM,
  RESUME_TOOL,
  RESUME_TOOL_NAME,
} from "../../../src/lib/veilleResume.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_MODEL = "claude-haiku-5-5";
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

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Méthode non autorisée" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "Non authentifié" }, 401);

  let id: string;
  let force = false;
  try {
    const body = await req.json();
    id = String(body?.id ?? "");
    force = body?.force === true;
  } catch {
    return json({ ok: false, error: "Corps de requête invalide" }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ ok: false, error: "Identifiant invalide" }, 400);

  // Client au nom de l'utilisateur : les droits RLS de la table s'appliquent.
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error } = await client
    .from("veille_annonces")
    .select("id, intitule, acheteur, raw, avis_resume")
    .eq("id", id)
    .maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 400);
  if (!row) return json({ ok: false, error: "Annonce introuvable." }, 404);
  if (row.avis_resume && !force) return json({ ok: true, resume: row.avis_resume });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ ok: false, error: "Secret ANTHROPIC_API_KEY absent." }, 500);

  const raw = (row.raw ?? {}) as Record<string, unknown>;
  const plats = CHAMPS_PLATS.map((k) => {
    const v = raw[k];
    if (v == null || v === "") return null;
    return `${k} : ${Array.isArray(v) ? v.join(", ") : String(v)}`;
  }).filter(Boolean);
  const donnees = raw["donnees"];
  const texte = (typeof donnees === "string" ? donnees : JSON.stringify(donnees ?? "")).slice(
    0,
    60000,
  );
  if (!donnees && plats.length === 0) {
    return json({ ok: false, error: "Texte de l'avis indisponible." }, 400);
  }

  const user = `Intitulé : ${row.intitule}\nAcheteur : ${row.acheteur ?? "—"}\n\n${plats.join("\n")}\n\n--- Avis complet (JSON BOAMP) ---\n${texte}`;
  const model = Deno.env.get("QUALIF_MODEL")?.trim() || DEFAULT_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  let resume;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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
    if (!res.ok) {
      return json({ ok: false, error: `API Anthropic ${res.status} : ${body.slice(0, 300)}` }, 502);
    }
    resume = parseResumeResponse(JSON.parse(body));
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Échec du résumé IA" }, 502);
  } finally {
    clearTimeout(timer);
  }

  await client
    .from("veille_annonces")
    .update({ avis_resume: resume, avis_resume_at: new Date().toISOString() })
    .eq("id", id);
  return json({ ok: true, resume });
});

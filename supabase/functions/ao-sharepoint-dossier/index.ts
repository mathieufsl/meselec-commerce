// Dossier SharePoint d'un AO (site RMS COMMERCE) via Microsoft Graph.
// - creer=true : crée AO/1_Non traité/<jj_mm_aaaa>/<VILLE>_<SECTEURS>/ si l'AO n'en a pas encore
//   (uniquement pour un AO « non traité »), puis enregistre le lien dans appels_offres.
// - Dans tous les cas : envoie dans ce dossier les documents de l'AO qui n'y sont pas encore
//   (un fichier du même nom déjà présent n'est pas écrasé).
// Secrets : MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET (application Entra ID, droit
// Sites.Selected en écriture sur le site). SHAREPOINT_SITE est facultatif.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  dossierDuJour,
  nomDossierAo,
  nettoyerNomSharepoint,
  SHAREPOINT_RACINE_NON_TRAITE,
  SHAREPOINT_SITE_DEFAUT,
} from "../../../src/lib/aoSharepoint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH = "https://graph.microsoft.com/v1.0";
const BUCKET = "ao-documents";
const ENVOI_SIMPLE_MAX = 4 * 1024 * 1024;
const MORCEAU = 320 * 1024 * 30; // multiple de 320 Kio exigé par Graph (~9,8 Mo)

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const seg = (chemin: string) => chemin.split("/").map(encodeURIComponent).join("/");

async function jetonGraph(): Promise<string | null> {
  const tenant = Deno.env.get("MS_TENANT_ID");
  const clientId = Deno.env.get("MS_CLIENT_ID");
  const secret = Deno.env.get("MS_CLIENT_SECRET");
  if (!tenant || !clientId || !secret) return null;
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Connexion Microsoft refusée : ${data.error_description ?? res.status}`);
  return data.access_token as string;
}

function graph(token: string) {
  return async (chemin: string, init: RequestInit = {}) => {
    const res = await fetch(chemin.startsWith("http") ? chemin : `${GRAPH}${chemin}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body && !(init.body instanceof Blob) && !(init.body instanceof Uint8Array)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(init.headers ?? {}),
      },
    });
    return res;
  };
}

async function erreurGraph(res: Response, quoi: string): Promise<Error> {
  let detail = String(res.status);
  try {
    const d = await res.json();
    detail = d?.error?.message ?? detail;
  } catch {
    /* corps vide */
  }
  return new Error(`${quoi} : ${detail}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Méthode non autorisée" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "Non authentifié" }, 401);

  let aoId: string;
  let creer = false;
  try {
    const body = await req.json();
    aoId = String(body?.aoId ?? "");
    creer = body?.creer === true;
  } catch {
    return json({ ok: false, error: "Corps de requête invalide" }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(aoId)) return json({ ok: false, error: "Identifiant invalide" }, 400);

  // Lecture au nom de l'utilisateur : s'il ne voit pas l'AO, on s'arrête là.
  const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ao, error } = await user
    .from("appels_offres")
    .select("id, reference, donneur_ordre_libre, statut, sharepoint_url, sharepoint_item_id")
    .eq("id", aoId)
    .maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 400);
  if (!ao) return json({ ok: false, error: "AO introuvable." }, 404);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    const token = await jetonGraph();
    if (!token) return json({ ok: false, code: "non_configure", error: "SharePoint non configuré." });
    const g = graph(token);

    const site = Deno.env.get("SHAREPOINT_SITE") || SHAREPOINT_SITE_DEFAUT;
    const resDrive = await g(`/sites/${site}:/drive?$select=id`);
    if (!resDrive.ok) throw await erreurGraph(resDrive, "Site SharePoint inaccessible");
    const driveId = (await resDrive.json()).id as string;

    let dossierId = ao.sharepoint_item_id as string | null;
    let dossierUrl = ao.sharepoint_url as string | null;
    let cree = false;

    if (dossierId) {
      const r = await g(`/drives/${driveId}/items/${dossierId}?$select=id,webUrl`);
      if (r.ok) dossierUrl = (await r.json()).webUrl;
      else dossierId = null; // dossier supprimé ou dans une autre bibliothèque
    }

    if (!dossierId) {
      if (!creer || ao.statut !== "non_traite" || ao.sharepoint_url) {
        return json({ ok: true, dossier: null, envoyes: 0, deja: 0 });
      }
      const { data: secteurs } = await admin.from("ao_secteurs").select("secteur").eq("ao_id", aoId);

      // Dossier du jour (créé s'il n'existe pas), puis dossier de l'AO dedans.
      const cheminJour = `${SHAREPOINT_RACINE_NON_TRAITE}/${dossierDuJour()}`;
      let rJour = await g(`/drives/${driveId}/root:/${seg(cheminJour)}?$select=id`);
      if (rJour.status === 404) {
        rJour = await g(`/drives/${driveId}/root:/${seg(SHAREPOINT_RACINE_NON_TRAITE)}:/children`, {
          method: "POST",
          body: JSON.stringify({
            name: dossierDuJour(),
            folder: {},
            "@microsoft.graph.conflictBehavior": "fail",
          }),
        });
        // Créé entre-temps par un autre AO : on le relit, sans jamais l'écraser.
        if (rJour.status === 409) {
          rJour = await g(`/drives/${driveId}/root:/${seg(cheminJour)}?$select=id`);
        }
      }
      if (!rJour.ok) throw await erreurGraph(rJour, "Dossier du jour impossible à créer");
      const jourId = (await rJour.json()).id as string;

      const nom = nomDossierAo({
        donneur_ordre_libre: ao.donneur_ordre_libre,
        reference: ao.reference,
        secteurs: (secteurs ?? []).map((s) => s.secteur as string),
      });
      const rAo = await g(`/drives/${driveId}/items/${jourId}/children`, {
        method: "POST",
        body: JSON.stringify({
          name: nom,
          folder: {},
          "@microsoft.graph.conflictBehavior": "rename",
        }),
      });
      if (!rAo.ok) throw await erreurGraph(rAo, "Dossier de l'AO impossible à créer");
      const item = await rAo.json();
      dossierId = item.id as string;
      dossierUrl = item.webUrl as string;
      cree = true;
    }

    await admin
      .from("appels_offres")
      .update({ sharepoint_item_id: dossierId, sharepoint_url: dossierUrl })
      .eq("id", aoId);

    // Documents de l'AO stockés dans l'app (les simples liens SharePoint sont ignorés).
    const { data: docs } = await admin
      .from("ao_documents")
      .select("nom_fichier, storage_path, version")
      .eq("ao_id", aoId)
      .not("storage_path", "is", null)
      .order("version", { ascending: false });

    let envoyes = 0;
    let deja = 0;
    const echecs: string[] = [];
    const vus = new Set<string>();
    for (const doc of docs ?? []) {
      const nomFichier = nettoyerNomSharepoint(doc.nom_fichier as string) || "document";
      if (vus.has(nomFichier)) continue; // seule la dernière version part
      vus.add(nomFichier);
      try {
        const { data: blob, error: dlErr } = await admin.storage
          .from(BUCKET)
          .download(doc.storage_path as string);
        if (dlErr || !blob) throw new Error(dlErr?.message ?? "fichier introuvable");
        const statut = await envoyer(g, driveId, dossierId!, nomFichier, blob);
        if (statut === "deja") deja++;
        else envoyes++;
      } catch (e) {
        echecs.push(`${nomFichier} (${(e as Error).message})`);
      }
    }

    return json({ ok: true, cree, dossier: dossierUrl, envoyes, deja, echecs });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 502);
  }
});

async function envoyer(
  g: ReturnType<typeof graph>,
  driveId: string,
  dossierId: string,
  nom: string,
  blob: Blob,
): Promise<"envoye" | "deja"> {
  const cible = `/drives/${driveId}/items/${dossierId}:/${encodeURIComponent(nom)}`;
  if (blob.size <= ENVOI_SIMPLE_MAX) {
    const r = await g(`${cible}:/content?@microsoft.graph.conflictBehavior=fail`, {
      method: "PUT",
      body: blob,
    });
    if (r.status === 409) return "deja";
    if (!r.ok) throw await erreurGraph(r, "envoi refusé");
    return "envoye";
  }

  const rSession = await g(`${cible}:/createUploadSession`, {
    method: "POST",
    body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "fail" } }),
  });
  if (rSession.status === 409) return "deja";
  if (!rSession.ok) throw await erreurGraph(rSession, "session d'envoi refusée");
  const { uploadUrl } = await rSession.json();

  for (let debut = 0; debut < blob.size; debut += MORCEAU) {
    const fin = Math.min(debut + MORCEAU, blob.size);
    // L'URL de session est pré-signée : pas d'en-tête Authorization.
    const r = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(fin - debut),
        "Content-Range": `bytes ${debut}-${fin - 1}/${blob.size}`,
      },
      body: blob.slice(debut, fin),
    });
    if (r.status === 409) return "deja";
    if (!r.ok) throw await erreurGraph(r, "envoi interrompu");
  }
  return "envoye";
}

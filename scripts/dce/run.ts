/**
 * Robot DCE de la veille AO (lancé par GitHub Actions, `.github/workflows/veille-dce.yml`).
 *
 * 1. Collecte BOAMP (même logique que la veille de l'application).
 * 2. Pour chaque annonce nouvelle à analyser : téléchargement du DCE sur la
 *    plateforme acheteur, extraction des archives, repérage RC/CCTP.
 * 3. Analyse IA (visite, certifications…) et enregistrement dans
 *    `veille_annonces` ; les pièces lues sont déposées dans le bucket `veille-dce`.
 *
 * Variables : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
 * identifiants des plateformes (voir plateformes.ts), et facultativement
 * VEILLE_DCE_LIMIT, VEILLE_DCE_ANNONCE (id ou source_id), VEILLE_DCE_DIAGNOSTIC=1,
 * VEILLE_DCE_SANS_COLLECTE=1.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Browser } from "playwright";
import type { VeilleAnalyse, VeilleDceFichier } from "../../src/lib/veilleAnalyse";
import {
  lireAvis,
  plateformeDepuisUrl,
  PLATEFORMES_GEREES,
  type VeillePlateforme,
} from "../../src/lib/veilleAvis";
import { collecterVeille, type OptionsCollecte } from "../../src/lib/veilleCollect.server";
import { collecterAtexo, PLATEFORMES_ATEXO } from "../../src/lib/veilleAtexo.server";
import { analyserAnnonce } from "./analyse";
import { deplierDce, selectionnerPieces } from "./fichiers";
import { identifiantsPour, telechargerDce } from "./plateformes";

const BUCKET = "veille-dce";
const MAX_TENTATIVES = 2;

/**
 * Erreurs qui se reproduiront à l'identique demain (parcours inconnu, accès
 * refusé, identifiants rejetés…) : inutile de retenter, on passe en échec.
 * Seules les erreurs passagères (réseau, délai dépassé) gardent un nouvel essai.
 */
function erreurDefinitive(message: string): boolean {
  return /parcours non reconnu|refuse l'acc[eè]s|connexion refus[ée]e|plateforme non g[ée]r[ée]e|trop volumineux/i.test(
    message,
  );
}

function env(nom: string): string {
  const v = process.env[nom];
  if (!v) throw new Error(`Variable d'environnement manquante : ${nom}`);
  return v;
}

const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const anthropic = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") });
const limite = Number(process.env["VEILLE_DCE_LIMIT"] ?? "15");
const annonceCiblee = process.env["VEILLE_DCE_ANNONCE"]?.trim() || null;
const diagnostic = process.env["VEILLE_DCE_DIAGNOSTIC"] === "1";
const dossierArtefacts = join(process.cwd(), "dce-diagnostic");
// Lien vers cette exécution (variables fournies par GitHub Actions).
const runUrl =
  process.env["GITHUB_RUN_ID"] && process.env["GITHUB_REPOSITORY"]
    ? `${process.env["GITHUB_SERVER_URL"] ?? "https://github.com"}/${process.env["GITHUB_REPOSITORY"]}/actions/runs/${process.env["GITHUB_RUN_ID"]}`
    : null;

type Annonce = {
  id: string;
  source_id: string;
  intitule: string;
  acheteur: string | null;
  url_dce: string | null;
  plateforme: VeillePlateforme | null;
  raw: Record<string, unknown>;
  analyse_tentatives: number;
};

async function annoncesATraiter(): Promise<Annonce[]> {
  let q = supabase
    .from("veille_annonces")
    .select(
      "id, source_id, intitule, acheteur, url_dce, dce_url, plateforme, raw, analyse_tentatives",
    );
  if (annonceCiblee) {
    q = /^[0-9a-f-]{36}$/i.test(annonceCiblee)
      ? q.eq("id", annonceCiblee)
      : q.eq("source_id", annonceCiblee);
  } else {
    // Uniquement les annonces dont l'analyse a été demandée depuis la page Veille.
    q = q
      .eq("analyse_statut", "a_faire")
      .order("date_parution", { ascending: false })
      .limit(limite);
  }
  const { data, error } = await q;
  if (error) throw error;
  // Adresse du DCE : celle lue à la collecte, sinon celle trouvée par la qualification IA.
  return ((data ?? []) as Array<Annonce & { dce_url: string | null }>).map(({ dce_url, ...a }) => {
    const url = a.url_dce ?? dce_url;
    return {
      ...a,
      url_dce: url,
      plateforme: (url ? plateformeDepuisUrl(url) : null) ?? a.plateforme,
    };
  });
}

async function deposerPieces(
  annonceId: string,
  pieces: Array<{ chemin: string; type: string }>,
): Promise<VeilleDceFichier[]> {
  const fichiers: VeilleDceFichier[] = [];
  for (const p of pieces) {
    const nom = basename(p.chemin);
    const taille = statSync(p.chemin).size;
    if (taille > 50 * 1024 * 1024) continue;
    const path = `${annonceId}/${p.type}_${nom.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, readFileSync(p.chemin), { upsert: true, contentType: contentType(nom) });
    if (error) {
      console.warn(`    ! dépôt ${nom} : ${error.message}`);
      continue;
    }
    fichiers.push({ nom, type: p.type, path, taille });
  }
  return fichiers;
}

function contentType(nom: string): string {
  const ext = nom.toLowerCase().split(".").pop();
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "odt") return "application/vnd.oasis.opendocument.text";
  return "application/octet-stream";
}

/**
 * Pièces déposées à la main depuis la page Veille (`<annonce>/depot/`) :
 * téléchargées dans `dossier`. Renvoie le nombre de fichiers récupérés.
 */
async function recupererDepot(annonceId: string, dossier: string): Promise<number> {
  const { data, error } = await supabase.storage.from(BUCKET).list(`${annonceId}/depot`);
  if (error || !data?.length) return 0;
  mkdirSync(dossier, { recursive: true });
  let n = 0;
  for (const f of data) {
    if (!f.name || f.name.startsWith(".")) continue;
    const { data: blob, error: e } = await supabase.storage
      .from(BUCKET)
      .download(`${annonceId}/depot/${f.name}`);
    if (e || !blob) {
      console.warn(`    ! dépôt ${f.name} illisible : ${e?.message ?? "vide"}`);
      continue;
    }
    writeFileSync(join(dossier, basename(f.name)), Buffer.from(await blob.arrayBuffer()));
    n += 1;
  }
  return n;
}

async function enregistrer(id: string, maj: Record<string, unknown>) {
  const { error } = await supabase.from("veille_annonces").update(maj).eq("id", id);
  if (error) throw error;
}

/** Étape affichée en direct sur la carte de l'annonce (sans bloquer le robot). */
async function etape(id: string, texte: string) {
  const { error } = await supabase
    .from("veille_annonces")
    .update({
      analyse_etape: texte.slice(0, 300),
      analyse_etape_at: new Date().toISOString(),
      analyse_run_url: runUrl,
    })
    .eq("id", id);
  if (error) console.warn(`    ! étape non enregistrée : ${error.message}`);
}

async function traiter(annonce: Annonce, navigateur: Browser | null) {
  console.log(`\n▶ ${annonce.source_id} — ${annonce.intitule.slice(0, 90)}`);
  await etape(annonce.id, "Robot démarré");
  const avis = lireAvis(annonce.raw ?? {}).texte;
  const base = { intitule: annonce.intitule, acheteur: annonce.acheteur, texteAvis: avis };

  // DCE déposé à la main : on lit ces pièces, sans passer par la plateforme.
  const dossierDepot = mkdtempSync(join(tmpdir(), "dce-depot-"));
  try {
    if ((await recupererDepot(annonce.id, dossierDepot)) > 0) {
      const tous = deplierDce(dossierDepot);
      const pieces = selectionnerPieces(tous);
      const fichiersDce = tous.map((f) => relative(dossierDepot, f));
      console.log(`  DCE déposé : ${tous.length} fichier(s), retenus : ${pieces.length}`);
      await etape(
        annonce.id,
        pieces.length
          ? `Lecture par Claude des pièces déposées : ${pieces.map((p) => basename(p.chemin)).join(", ")}`
          : "RC/CCTP introuvables dans les pièces déposées : lecture de l'avis par Claude",
      );
      const analyse = await analyserAnnonce({ client: anthropic, ...base, pieces, fichiersDce });
      const dceFichiers = await deposerPieces(annonce.id, pieces);
      await enregistrer(annonce.id, {
        analyse_dce: analyse,
        analyse_statut: pieces.length ? "termine" : "sans_dce",
        analyse_erreur: pieces.length ? null : "RC/CCTP introuvables dans les pièces déposées",
        analyse_at: new Date().toISOString(),
        analyse_tentatives: annonce.analyse_tentatives + 1,
        dce_fichiers: dceFichiers,
      });
      return;
    }
  } finally {
    rmSync(dossierDepot, { recursive: true, force: true });
  }

  const plateforme = annonce.plateforme;
  const gere =
    annonce.url_dce && plateforme && PLATEFORMES_GEREES.includes(plateforme) && navigateur;

  if (!gere) {
    const raison = !annonce.url_dce
      ? "adresse du DCE absente de l'avis"
      : `plateforme non gérée (${plateforme ?? "inconnue"})`;
    console.log(`  ${raison} → analyse sur l'avis seul`);
    await etape(annonce.id, `${raison} : lecture de l'avis par Claude`);
    const analyse = await analyserAnnonce({
      client: anthropic,
      ...base,
      pieces: [],
      fichiersDce: [],
    });
    await enregistrer(annonce.id, {
      analyse_dce: analyse,
      analyse_statut: "sans_dce",
      analyse_erreur: raison,
      analyse_at: new Date().toISOString(),
    });
    return;
  }

  if (!identifiantsPour(plateforme)) {
    console.log(`  pas d'identifiants ${plateforme} configurés : tentative sans connexion`);
  }
  await etape(annonce.id, `Téléchargement du DCE sur ${plateforme}`);

  const dossier = mkdtempSync(join(tmpdir(), "dce-"));
  try {
    let pieces: Array<{
      chemin: string;
      type: ReturnType<typeof selectionnerPieces>[number]["type"];
    }> = [];
    let fichiersDce: string[] = [];
    try {
      await telechargerDce({
        navigateur,
        plateforme,
        url: annonce.url_dce as string,
        dossier,
        dossierDiagnostic: diagnostic ? join(dossierArtefacts, annonce.source_id) : null,
        onEtape: (texte) => etape(annonce.id, `${plateforme} : ${texte}`),
      });
      const tous = deplierDce(dossier);
      fichiersDce = tous.map((f) => relative(dossier, f));
      pieces = selectionnerPieces(tous);
      console.log(
        `  DCE : ${tous.length} fichier(s), retenus : ${pieces.map((p) => basename(p.chemin)).join(", ") || "aucun"}`,
      );
    } catch (e) {
      const message = (e as Error).message;
      const tentatives = annonce.analyse_tentatives + 1;
      console.log(`  ✗ DCE non récupéré : ${message}`);
      if (tentatives < MAX_TENTATIVES && !erreurDefinitive(message)) {
        await enregistrer(annonce.id, { analyse_tentatives: tentatives, analyse_erreur: message });
        await etape(annonce.id, "DCE non récupéré : nouvel essai au prochain passage (7h17)");
        return;
      }
      await etape(annonce.id, "DCE non récupéré : lecture de l'avis par Claude");
      // Dernière tentative : on garde au moins l'analyse de l'avis.
      const analyse = await analyserAnnonce({
        client: anthropic,
        ...base,
        pieces: [],
        fichiersDce: [],
      });
      await enregistrer(annonce.id, {
        analyse_dce: analyse,
        analyse_statut: "echec",
        analyse_tentatives: tentatives,
        analyse_erreur: message,
        analyse_at: new Date().toISOString(),
      });
      return;
    }

    await etape(
      annonce.id,
      pieces.length
        ? `Lecture par Claude : ${pieces.map((p) => basename(p.chemin)).join(", ")}`
        : "RC/CCTP introuvables dans le DCE : lecture de l'avis par Claude",
    );
    const analyse: VeilleAnalyse = await analyserAnnonce({
      client: anthropic,
      ...base,
      pieces,
      fichiersDce,
    });
    const dceFichiers = await deposerPieces(annonce.id, pieces);
    await enregistrer(annonce.id, {
      analyse_dce: analyse,
      analyse_statut: pieces.length ? "termine" : "sans_dce",
      analyse_erreur: pieces.length ? null : "RC/CCTP introuvables dans le DCE",
      analyse_at: new Date().toISOString(),
      analyse_tentatives: annonce.analyse_tentatives + 1,
      dce_fichiers: dceFichiers,
    });
    console.log(`  ✓ ${analyse.visite.exigee}, ${analyse.certifications.length} certification(s)`);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env["VEILLE_DCE_SANS_COLLECTE"] !== "1" && !annonceCiblee) {
    // Veille manuelle lancée depuis l'application : sources et critères choisis
    // (le BOAMP est alors déjà lu par l'application).
    let parametres: (OptionsCollecte & { sources?: string[] }) | null = null;
    try {
      parametres = process.env["VEILLE_PARAMETRES"]
        ? (JSON.parse(process.env["VEILLE_PARAMETRES"]) as OptionsCollecte & { sources?: string[] })
        : null;
    } catch {
      console.warn("Paramètres de veille illisibles : collecte habituelle");
    }
    const { sources, ...options } = parametres ?? {};
    if (!parametres) {
      const collecte = await collecterVeille(supabase, { fenetreJours: 3, idfSeulement: true });
      console.log(
        collecte.ok
          ? `Collecte BOAMP : ${collecte.nouvelles} nouvelle(s), ${collecte.retenues} retenue(s) / ${collecte.collectees}`
          : `Collecte BOAMP en échec : ${collecte.error}`,
      );
    } else {
      console.log("Veille manuelle :", JSON.stringify(parametres));
    }
    // Plateformes Atexo (Maximilien, PLACE) : les MAPA qui ne passent pas au BOAMP.
    for (const p of PLATEFORMES_ATEXO) {
      if (sources && !sources.includes(p.source)) continue;
      try {
        const r = await collecterAtexo(supabase, p, (m) => console.log(m), options);
        if (r.erreurs.length)
          console.warn(`  ${p.libelle} : ${r.erreurs.length} erreur(s)`, r.erreurs.slice(0, 5));
      } catch (e) {
        console.error(`Collecte ${p.libelle} en échec : ${(e as Error).message}`);
      }
    }
  }

  const annonces = await annoncesATraiter();
  console.log(`${annonces.length} annonce(s) à analyser`);
  if (annonces.length === 0) return;
  // Les annonces traitées l'une après l'autre : chacune sait qu'elle attend son tour.
  for (const [i, a] of annonces.entries()) {
    if (i > 0) await etape(a.id, `En file : ${i} annonce(s) avant celle-ci`);
  }

  const navigateur = await chromium.launch({ headless: true }).catch((e: Error) => {
    console.warn(`Navigateur indisponible (${e.message}) : analyses sur l'avis seul`);
    return null;
  });
  let echecs = 0;
  try {
    for (const annonce of annonces) {
      try {
        await traiter(annonce, navigateur);
      } catch (e) {
        echecs += 1;
        console.error(`  ✗ ${annonce.source_id} : ${(e as Error).message}`);
        await enregistrer(annonce.id, { analyse_erreur: (e as Error).message }).catch(
          () => undefined,
        );
        await etape(annonce.id, `Erreur : ${(e as Error).message}`);
      }
    }
  } finally {
    await navigateur?.close();
  }
  console.log(`\nTerminé : ${annonces.length - echecs} traitée(s), ${echecs} en erreur`);
  if (echecs === annonces.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

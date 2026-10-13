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
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Browser } from "playwright";
import type { VeilleAnalyse, VeilleDceFichier } from "../../src/lib/veilleAnalyse";
import { lireAvis, PLATEFORMES_GEREES, type VeillePlateforme } from "../../src/lib/veilleAvis";
import { collecterVeille } from "../../src/lib/veilleCollect.server";
import { analyserAnnonce } from "./analyse";
import { deplierDce, selectionnerPieces } from "./fichiers";
import { identifiantsPour, telechargerDce } from "./plateformes";

const BUCKET = "veille-dce";
const MAX_TENTATIVES = 2;

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
    .select("id, source_id, intitule, acheteur, url_dce, plateforme, raw, analyse_tentatives");
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
  return (data ?? []) as Annonce[];
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

async function enregistrer(id: string, maj: Record<string, unknown>) {
  const { error } = await supabase.from("veille_annonces").update(maj).eq("id", id);
  if (error) throw error;
}

async function traiter(annonce: Annonce, navigateur: Browser | null) {
  console.log(`\n▶ ${annonce.source_id} — ${annonce.intitule.slice(0, 90)}`);
  const avis = lireAvis(annonce.raw ?? {}).texte;
  const base = { intitule: annonce.intitule, acheteur: annonce.acheteur, texteAvis: avis };

  const plateforme = annonce.plateforme;
  const gere =
    annonce.url_dce && plateforme && PLATEFORMES_GEREES.includes(plateforme) && navigateur;

  if (!gere) {
    const raison = !annonce.url_dce
      ? "adresse du DCE absente de l'avis"
      : `plateforme non gérée (${plateforme ?? "inconnue"})`;
    console.log(`  ${raison} → analyse sur l'avis seul`);
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
      if (tentatives < MAX_TENTATIVES) {
        await enregistrer(annonce.id, { analyse_tentatives: tentatives, analyse_erreur: message });
        return;
      }
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
    const collecte = await collecterVeille(supabase, { fenetreJours: 3, idfSeulement: true });
    console.log(
      collecte.ok
        ? `Collecte BOAMP : ${collecte.nouvelles} nouvelle(s), ${collecte.retenues} retenue(s) / ${collecte.collectees}`
        : `Collecte BOAMP en échec : ${collecte.error}`,
    );
  }

  const annonces = await annoncesATraiter();
  console.log(`${annonces.length} annonce(s) à analyser`);
  if (annonces.length === 0) return;

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

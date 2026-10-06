/**
 * DCE téléchargé : extraction des archives (zip imbriqués compris), repérage
 * des pièces utiles (RC, CCTP…) et extraction de leur texte.
 *
 * Les archives viennent de sites tiers : on extrait chacune dans son propre
 * dossier, on borne la taille et on refuse tout fichier sorti du dossier.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";

export type TypePiece =
  "rc" | "cctp" | "ccap" | "visite" | "ae" | "bpu" | "dpgf" | "dqe" | "plan" | "autre";

const MAX_TOTAL_OCTETS = 600 * 1024 * 1024;
const MAX_PROFONDEUR = 4;

function normaliser(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_.-]+/g, " ");
}

/** Type de pièce d'après le nom du fichier (et du dossier parent). */
export function classerPiece(chemin: string): TypePiece {
  const n = normaliser(chemin.split(/[\\/]/).slice(-2).join(" "));
  const fichier = normaliser(basename(chemin));
  if (/attestation de visite|certificat de visite|bon de visite|\bvisite\b/.test(fichier))
    return "visite";
  if (/\bcctp\b|clauses? techniques/.test(fichier)) return "cctp";
  if (/\bccap\b|clauses? administratives/.test(fichier)) return "ccap";
  if (/\brc\b|r c |reglement (de |du )?(la )?consultation|\breglement\b/.test(fichier)) return "rc";
  if (/\bdpgf\b/.test(fichier)) return "dpgf";
  if (/\bbpu\b|bordereau des prix/.test(fichier)) return "bpu";
  if (/\bdqe\b|detail quantitatif/.test(fichier)) return "dqe";
  if (/\bae\b|acte d engagement/.test(fichier)) return "ae";
  if (/\bplans?\b|\bdwg$/.test(fichier)) return "plan";
  // Dossier parent explicite (ex. « 02 - CCTP/annexe.pdf »).
  if (/\bcctp\b/.test(n)) return "cctp";
  if (/\brc\b|reglement de (la )?consultation/.test(n)) return "rc";
  return "autre";
}

const EXT_LISIBLES = new Set([".pdf", ".docx", ".odt", ".txt", ".rtf", ".doc"]);
const EXT_ARCHIVES = new Set([".zip", ".7z", ".rar"]);

export function estLisible(chemin: string): boolean {
  return EXT_LISIBLES.has(extname(chemin).toLowerCase());
}

/**
 * Pièces à faire lire par l'IA : RC et CCTP, plus le CCAP si le RC manque, et
 * tout document « visite ».
 */
export function selectionnerPieces(chemins: string[]): Array<{ chemin: string; type: TypePiece }> {
  const pieces = chemins
    .filter(estLisible)
    .map((chemin) => ({ chemin, type: classerPiece(chemin) }));
  const aRc = pieces.some((p) => p.type === "rc");
  const retenues = pieces.filter(
    (p) =>
      p.type === "rc" || p.type === "cctp" || p.type === "visite" || (!aRc && p.type === "ccap"),
  );
  // Un même document fourni en PDF et en Word : on garde le PDF.
  const parCle = new Map<string, { chemin: string; type: TypePiece }>();
  for (const p of retenues) {
    const cle = `${p.type}:${normaliser(basename(p.chemin, extname(p.chemin)))}`;
    const existant = parCle.get(cle);
    if (!existant || extname(p.chemin).toLowerCase() === ".pdf") parCle.set(cle, p);
  }
  const ordre: TypePiece[] = ["rc", "ccap", "visite", "cctp"];
  return [...parCle.values()].sort((a, b) => ordre.indexOf(a.type) - ordre.indexOf(b.type));
}

function listerFichiers(dossier: string): string[] {
  const out: string[] = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isSymbolicLink()) continue;
    if (entree.isDirectory()) out.push(...listerFichiers(chemin));
    else if (entree.isFile()) out.push(chemin);
  }
  return out;
}

function tailleTotale(fichiers: string[]): number {
  return fichiers.reduce((t, f) => t + statSync(f).size, 0);
}

function extraireArchive(archive: string, destination: string): void {
  mkdirSync(destination, { recursive: true });
  const ext = extname(archive).toLowerCase();
  if (ext === ".zip") {
    try {
      // -O CP850 : noms de fichiers des zips Windows ; unzip refuse les chemins « ../ ».
      execFileSync("unzip", ["-qq", "-o", "-O", "CP850", archive, "-d", destination], {
        stdio: "pipe",
        timeout: 120_000,
      });
      return;
    } catch {
      // Repli sur 7z (zip64, chiffrement d'en-tête…)
    }
  }
  execFileSync("7z", ["x", "-y", "-bd", `-o${destination}`, archive], {
    stdio: "pipe",
    timeout: 180_000,
  });
}

/**
 * Extrait récursivement les archives présentes dans `dossier` et renvoie la
 * liste de tous les fichiers obtenus (hors archives).
 */
export function deplierDce(dossier: string): string[] {
  const racine = realpathSync(dossier);
  const dejaVues = new Set<string>();
  for (let niveau = 0; niveau < MAX_PROFONDEUR; niveau += 1) {
    const archives = listerFichiers(racine).filter(
      (f) => EXT_ARCHIVES.has(extname(f).toLowerCase()) && !dejaVues.has(f),
    );
    if (archives.length === 0) break;
    for (const archive of archives) {
      dejaVues.add(archive);
      const dest = `${archive}.d`;
      try {
        extraireArchive(archive, dest);
      } catch (e) {
        console.warn(
          `  ! archive illisible ${basename(archive)} : ${(e as Error).message.split("\n")[0]}`,
        );
      }
      if (tailleTotale(listerFichiers(racine)) > MAX_TOTAL_OCTETS) {
        throw new Error("DCE trop volumineux une fois décompressé (> 600 Mo)");
      }
    }
  }
  return listerFichiers(racine).filter((f) => {
    const reel = realpathSync(f);
    return !relative(racine, reel).startsWith("..") && !EXT_ARCHIVES.has(extname(f).toLowerCase());
  });
}

function xmlVersTexte(xml: string): string {
  return xml
    .replace(/<w:tab\/>|<text:tab\/>/g, "\t")
    .replace(/<\/w:p>|<\/text:p>|<\/text:h>|<w:br\/>|<text:line-break\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Texte d'une pièce. Renvoie une chaîne vide si le document n'a pas de couche
 * texte exploitable (PDF scanné) : l'appelant envoie alors le PDF lui-même.
 */
export function texteDePiece(chemin: string): string {
  const ext = extname(chemin).toLowerCase();
  const opts = { stdio: "pipe" as const, timeout: 120_000, maxBuffer: 64 * 1024 * 1024 };
  try {
    if (ext === ".pdf") {
      return execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", chemin, "-"], opts).toString(
        "utf8",
      );
    }
    if (ext === ".docx") {
      return xmlVersTexte(
        execFileSync("unzip", ["-p", chemin, "word/document.xml"], opts).toString("utf8"),
      );
    }
    if (ext === ".odt") {
      return xmlVersTexte(
        execFileSync("unzip", ["-p", chemin, "content.xml"], opts).toString("utf8"),
      );
    }
    if (ext === ".txt" || ext === ".rtf") {
      return execFileSync("cat", [chemin], opts).toString("utf8");
    }
  } catch (e) {
    console.warn(
      `  ! lecture impossible ${basename(chemin)} : ${(e as Error).message.split("\n")[0]}`,
    );
  }
  return "";
}

/** Un PDF dont on tire moins de ~200 caractères par page est probablement scanné. */
export function texteSuffisant(texte: string, octets: number): boolean {
  const lettres = texte.replace(/\s+/g, "").length;
  return lettres > 400 || (octets < 200_000 && lettres > 100);
}

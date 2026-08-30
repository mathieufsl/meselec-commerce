/**
 * Importe les documents AO depuis l'archive OneDrive (AO déjà seedés en base).
 * Ignore les fichiers > 50 Mo et les archives imbriquées (.zip).
 */
import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { tmpdir } from "node:os";

const ZIP_PATH = process.argv[2] ?? "/Users/mathieufaessel/Downloads/OneDrive_1_30-08-2026.zip";
const MAX_BYTES = 50 * 1024 * 1024;
const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(
  /\/$/,
  "",
);
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const BUCKET = "ao-documents";
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

const AO_MAP: Array<{ folderPrefix: string; reference: string }> = [
  { folderPrefix: "260702_Arc de triomphe", reference: "260702" },
  { folderPrefix: "260713_12H_GOUSSAINVILLE", reference: "260713" },
  {
    folderPrefix:
      "Exploitation, maintenance préventive et corrective des installations d’éclairage et d’électricité de l’Arc de Triomphe",
    reference: "26-641",
  },
  { folderPrefix: "MAIRIE DE JOUARS PONTCHARTRAIN", reference: "AO-JOUARS" },
  { folderPrefix: "MAIRIE DE OSNY", reference: "AO-OSNY" },
  { folderPrefix: "Mairie d'Evry-Courcouronnes", reference: "AO-EVRY" },
  { folderPrefix: "Mairie de champagne sur oise", reference: "AO-CHAMP" },
  { folderPrefix: "rue flachat Asniére sur seine", reference: "AO-ASN" },
];

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${path}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function uploadStorage(path: string, buffer: Buffer, contentType: string) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encoded}`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: buffer,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Storage ${res.status}: ${body}`);
  }
}

function docTypeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.includes("/00_dce/") || lower.includes("\\00_dce\\")) {
    if (lower.includes("rc_") || lower.includes("reglement")) return "rc";
    if (lower.includes("cctp")) return "cctp";
    if (lower.includes("ccap")) return "ae";
    if (lower.includes("dpgf")) return "dpgf";
    if (lower.includes("bpu")) return "bpu";
    return "dce";
  }
  if (lower.includes("memoire") || lower.includes("m+moire") || lower.includes("mémoire"))
    return "memoire";
  if (lower.includes("/03_") || lower.includes("reponse") || lower.includes("réponse")) return "reponse";
  if (lower.includes("attestationdepot")) return "reponse";
  if (lower.includes("chiffrage")) return "annexe";
  return "annexe";
}

function shouldSkipPath(path: string): boolean {
  const name = basename(path);
  if (name.startsWith("~$") || name.startsWith("._") || name === ".DS_Store") return true;
  if (path.includes("__MACOSX")) return true;
  if (name.endsWith(".tmp")) return true;
  if (name.toLowerCase().endsWith(".zip")) return true;
  return false;
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function resolveFolderPath(tmp: string, folderPrefix: string): string | null {
  const direct = join(tmp, folderPrefix);
  try {
    if (statSync(direct).isDirectory()) return direct;
  } catch {
    /* fuzzy */
  }
  const normalized = folderPrefix.toLowerCase().replace(/\s+/g, " ").trim();
  for (const entry of readdirSync(tmp)) {
    try {
      if (!statSync(join(tmp, entry)).isDirectory()) continue;
    } catch {
      continue;
    }
    if (entry.toLowerCase().replace(/\s+/g, " ").trim() === normalized) {
      return join(tmp, entry);
    }
  }
  return null;
}

function mimeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
  };
  return map[ext] ?? "application/octet-stream";
}

async function uploadFile(aoId: string, absPath: string, relFromRoot: string) {
  const fileName = basename(absPath);
  const type = docTypeFromPath(relFromRoot);
  const storagePath = `${aoId}/${type}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buffer = readFileSync(absPath);

  await uploadStorage(storagePath, buffer, mimeFor(fileName));

  await rest("ao_documents", {
    method: "POST",
    body: JSON.stringify({
      ao_id: aoId,
      type,
      nom_fichier: fileName,
      storage_path: storagePath,
      fichier_url: storagePath,
      taille_octets: buffer.length,
      notes: "Import OneDrive 30/08/2026",
      uploaded_by_email: "import@meselec.fr",
    }),
    headers: { Prefer: "return=minimal" },
  });
}

async function main() {
  const tmp = mkdtempSync(join(tmpdir(), "ao-import-"));
  console.log(`[1/3] Extraction de ${ZIP_PATH}…`);
  execSync(`unzip -q "${ZIP_PATH}" -d "${tmp}"`);

  console.log("[2/3] Chargement des AO…");
  const aos = await rest<Array<{ id: string; reference: string }>>(
    "appels_offres?select=id,reference",
  );
  const aoByRef = new Map(aos.map((a) => [a.reference, a.id]));

  let uploaded = 0;
  let skipped = 0;
  let skippedLarge = 0;

  console.log("[3/3] Upload (< 50 Mo, sans .zip)…\n");

  for (const { folderPrefix, reference } of AO_MAP) {
    const aoId = aoByRef.get(reference);
    if (!aoId) {
      console.warn(`⚠ AO introuvable: ${reference}`);
      continue;
    }

    const folderPath = resolveFolderPath(tmp, folderPrefix);
    if (!folderPath) {
      console.warn(`⚠ Dossier introuvable: ${folderPrefix}`);
      continue;
    }

    let aoUploaded = 0;
    for (const file of walkFiles(folderPath)) {
      const rel = relative(folderPath, file);
      if (shouldSkipPath(rel)) {
        skipped++;
        continue;
      }

      const size = statSync(file).size;
      if (size > MAX_BYTES) {
        console.log(`  ⊘ ${basename(rel)} (${formatSize(size)} > 50 Mo)`);
        skippedLarge++;
        skipped++;
        continue;
      }

      try {
        await uploadFile(aoId, file, rel);
        uploaded++;
        aoUploaded++;
        console.log(`  ✓ ${basename(rel)} (${formatSize(size)})`);
      } catch (e) {
        console.warn(`  ✗ ${basename(rel)}:`, e instanceof Error ? e.message : e);
        skipped++;
      }
    }

    console.log(`→ ${reference}: ${aoUploaded} fichier(s)\n`);
  }

  rmSync(tmp, { recursive: true, force: true });
  console.log(
    `Terminé — ${uploaded} uploadés, ${skippedLarge} ignorés (> 50 Mo), ${skipped - skippedLarge} autres ignorés`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

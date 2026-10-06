/**
 * Téléchargement du DCE sur les profils acheteurs, avec un navigateur
 * (Playwright / Chromium).
 *
 * Les parcours diffèrent d'une plateforme à l'autre et changent avec le temps :
 * plutôt que de figer des sélecteurs, chaque étape cherche la meilleure action
 * visible (bandeau cookies, lien « Télécharger le DCE », formulaire de
 * connexion, cases de conditions d'utilisation, bouton de validation) jusqu'à
 * obtenir un téléchargement. Chaque plateforme fournit ses identifiants et des
 * indications propres (libellés, page de connexion).
 *
 * En mode diagnostic, chaque étape laisse une capture et le HTML de la page
 * dans le dossier d'artefacts pour pouvoir ajuster les règles.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser, BrowserContext, Download, Locator, Page } from "playwright";
import { plateformeDepuisUrl, type VeillePlateforme } from "../../src/lib/veilleAvis";

export type Identifiants = { login: string; motDePasse: string };

type ConfigPlateforme = {
  /** Variables d'environnement (secrets GitHub) des identifiants. */
  envLogin: string;
  envMotDePasse: string;
  /** Page de connexion à ouvrir avant la consultation (facultatif). */
  urlConnexion?: string;
  /** Libellés propres à la plateforme pour atteindre le DCE, par ordre de préférence. */
  liensDce: RegExp[];
};

const LIENS_DCE_COMMUNS = [
  /t[ée]l[ée]charger\s+(le\s+)?(dossier|dce)/i,
  /dossier\s+de\s+consultation/i,
  /documents?\s+de\s+la\s+consultation/i,
  /acc[ée]der\s+(au|aux)\s+(dce|documents)/i,
  /^\s*dce\s*$/i,
  /retirer\s+(le\s+)?dce/i,
];

export const PLATEFORMES: Partial<Record<VeillePlateforme, ConfigPlateforme>> = {
  PLACE: {
    envLogin: "PLACE_LOGIN",
    envMotDePasse: "PLACE_PASSWORD",
    liensDce: [
      /t[ée]l[ée]charger\s+le\s+dossier\s+de\s+consultation/i,
      /^\s*dossier\s+de\s+consultation\s*$/i,
    ],
  },
  Maximilien: {
    envLogin: "MAXIMILIEN_LOGIN",
    envMotDePasse: "MAXIMILIEN_PASSWORD",
    liensDce: [
      /t[ée]l[ée]charger\s+le\s+dossier\s+de\s+consultation/i,
      /^\s*dossier\s+de\s+consultation\s*$/i,
    ],
  },
  AWS: {
    envLogin: "AWS_LOGIN",
    envMotDePasse: "AWS_PASSWORD",
    liensDce: [/t[ée]l[ée]charger\s+(le\s+)?dce/i, /acc[ée]der\s+[àa]\s+la\s+consultation/i],
  },
  achatpublic: {
    envLogin: "ACHATPUBLIC_LOGIN",
    envMotDePasse: "ACHATPUBLIC_PASSWORD",
    liensDce: [/t[ée]l[ée]charger\s+(le\s+)?dce/i, /retirer\s+(le\s+)?dce/i],
  },
  "marches-securises": {
    envLogin: "MARCHES_SECURISES_LOGIN",
    envMotDePasse: "MARCHES_SECURISES_PASSWORD",
    liensDce: [/t[ée]l[ée]charger\s+(le\s+)?dce/i, /retirer\s+(le\s+)?dce/i, /^\s*dce\s*$/i],
  },
};

export function identifiantsPour(plateforme: VeillePlateforme): Identifiants | null {
  const conf = PLATEFORMES[plateforme];
  if (!conf) return null;
  const login = process.env[conf.envLogin];
  const motDePasse = process.env[conf.envMotDePasse];
  return login && motDePasse ? { login, motDePasse } : null;
}

const BOUTONS_COOKIES =
  /^(tout\s+)?accepter|j'accepte|accepter\s+(et\s+fermer|tout)|ok\s*,?\s*j'ai compris/i;
const BOUTONS_CONNEXION =
  /se\s+connecter|connexion|s'identifier|m'identifier|identifiez-vous|valider|^ok$/i;
const BOUTONS_VALIDATION =
  /t[ée]l[ée]charger|valider|confirmer|continuer|j'accepte|accepter\s+les\s+conditions|suivant/i;

type Journal = (etape: string) => Promise<void>;

async function premierVisible(candidats: Locator): Promise<Locator | null> {
  const n = Math.min(await candidats.count(), 30);
  for (let i = 0; i < n; i += 1) {
    const el = candidats.nth(i);
    if (await el.isVisible().catch(() => false)) return el;
  }
  return null;
}

async function cliquableParTexte(page: Page, motifs: RegExp[]): Promise<Locator | null> {
  for (const motif of motifs) {
    for (const role of ["link", "button"] as const) {
      const el = await premierVisible(page.getByRole(role, { name: motif }));
      if (el) return el;
    }
    const el = await premierVisible(
      page.locator("a, button, input[type=submit], input[type=button]").filter({ hasText: motif }),
    );
    if (el) return el;
  }
  return null;
}

async function fermerCookies(page: Page): Promise<void> {
  const btn = await premierVisible(page.getByRole("button", { name: BOUTONS_COOKIES }));
  if (btn) await btn.click({ timeout: 3000 }).catch(() => undefined);
}

/** Remplit un formulaire de connexion visible. Renvoie true si une connexion a été tentée. */
async function seConnecterSiDemande(
  page: Page,
  plateforme: VeillePlateforme,
  id: Identifiants | null,
): Promise<boolean> {
  const motDePasse = await premierVisible(page.locator("input[type=password]"));
  if (!motDePasse) return false;
  if (!id)
    throw new Error("La plateforme demande une connexion mais aucun identifiant n'est configuré");
  // Les identifiants ne sont jamais saisis hors du domaine de la plateforme.
  if (plateformeDepuisUrl(page.url()) !== plateforme) {
    throw new Error(
      `Formulaire de connexion sur un domaine inattendu (${new URL(page.url()).hostname})`,
    );
  }

  const formulaire = motDePasse.locator("xpath=ancestor::form[1]");
  const champsLogin = (await formulaire.count())
    ? formulaire.locator("input[type=email], input[type=text], input:not([type])")
    : page.locator("input[type=email], input[type=text], input:not([type])");
  const login = await premierVisible(champsLogin);
  if (!login) throw new Error("Champ identifiant introuvable sur le formulaire de connexion");

  await login.fill(id.login);
  await motDePasse.fill(id.motDePasse);
  const valider =
    (await formulaire.count()) > 0
      ? await premierVisible(
          formulaire.locator("button, input[type=submit], input[type=image], a").filter({
            hasText: BOUTONS_CONNEXION,
          }),
        )
      : null;
  if (valider) await valider.click();
  else await motDePasse.press("Enter");
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForTimeout(1500);
  if (await premierVisible(page.locator("input[type=password]"))) {
    const erreur = await page
      .locator("[class*=error], [class*=erreur], .alert, [role=alert]")
      .first()
      .innerText({ timeout: 1000 })
      .catch(() => "");
    throw new Error(`Connexion refusée${erreur ? ` : ${erreur.trim().slice(0, 160)}` : ""}`);
  }
  return true;
}

/** Coche les cases encore décochées (conditions d'utilisation, choix « tous les fichiers »). */
async function cocherConditions(page: Page): Promise<number> {
  const cases = page.locator("input[type=checkbox]");
  const n = Math.min(await cases.count(), 20);
  let cochees = 0;
  for (let i = 0; i < n; i += 1) {
    const c = cases.nth(i);
    if (!(await c.isVisible().catch(() => false))) continue;
    if (await c.isChecked().catch(() => true)) continue;
    await c.check({ timeout: 2000 }).catch(() => undefined);
    cochees += 1;
  }
  return cochees;
}

/**
 * Parcourt la consultation jusqu'au téléchargement du DCE.
 * Renvoie les chemins des fichiers téléchargés dans `dossier`.
 */
export async function telechargerDce(params: {
  navigateur: Browser;
  plateforme: VeillePlateforme;
  url: string;
  dossier: string;
  dossierDiagnostic: string | null;
}): Promise<string[]> {
  const { navigateur, plateforme, url, dossier, dossierDiagnostic } = params;
  const conf = PLATEFORMES[plateforme];
  if (!conf) throw new Error(`Plateforme non gérée : ${plateforme}`);
  const id = identifiantsPour(plateforme);

  const contexte: BrowserContext = await navigateur.newContext({
    acceptDownloads: true,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    viewport: { width: 1366, height: 900 },
  });
  contexte.setDefaultTimeout(20_000);

  const telechargements: Download[] = [];
  const suivre = (p: Page) => p.on("download", (d) => telechargements.push(d));
  contexte.on("page", suivre);

  let numero = 0;
  const journal: Journal = async (etape) => {
    numero += 1;
    console.log(`    [${numero}] ${etape}`);
    if (!dossierDiagnostic) return;
    mkdirSync(dossierDiagnostic, { recursive: true });
    for (const [i, p] of contexte.pages().entries()) {
      const base = join(dossierDiagnostic, `${String(numero).padStart(2, "0")}-${i}`);
      await p.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => undefined);
      writeFileSync(`${base}.html`, await p.content().catch(() => ""));
    }
  };

  try {
    // L'écouteur « page » du contexte suit aussi cet onglet.
    let page = await contexte.newPage();

    if (conf.urlConnexion && id) {
      await page.goto(conf.urlConnexion, { waitUntil: "domcontentloaded" });
      await fermerCookies(page);
      await seConnecterSiDemande(page, plateforme, id);
      await journal("connexion préalable");
    }

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await fermerCookies(page);
    await journal(`consultation ouverte (${page.url()})`);

    const liens = [...conf.liensDce, ...LIENS_DCE_COMMUNS];
    for (let etape = 0; etape < 8 && telechargements.length === 0; etape += 1) {
      // Un clic peut ouvrir un nouvel onglet : on suit le plus récent.
      page = contexte.pages().at(-1) ?? page;
      await fermerCookies(page);

      if (await seConnecterSiDemande(page, plateforme, id)) {
        await journal("connecté");
        continue;
      }

      const cochees = await cocherConditions(page);
      const action =
        (await cliquableParTexte(page, liens)) ??
        (cochees > 0 || etape > 0 ? await cliquableParTexte(page, [BOUTONS_VALIDATION]) : null);
      if (!action) {
        await journal("aucune action trouvée");
        break;
      }
      const libelle = (
        (await action.innerText().catch(() => "")) ||
        (await action.getAttribute("value")) ||
        ""
      )
        .trim()
        .slice(0, 60);
      const attente = page.waitForEvent("download", { timeout: 25_000 }).catch(() => null);
      await action.click();
      await Promise.race([
        attente,
        page.waitForLoadState("domcontentloaded").then(() => page.waitForTimeout(2500)),
      ]);
      await journal(`clic « ${libelle} »`);
    }

    // Laisse aux téléchargements lancés le temps de démarrer.
    if (telechargements.length === 0) await page.waitForTimeout(3000);
    if (telechargements.length === 0)
      throw new Error("Aucun fichier téléchargé (parcours non reconnu)");

    mkdirSync(dossier, { recursive: true });
    const chemins: string[] = [];
    for (const [i, d] of telechargements.entries()) {
      const nom = d.suggestedFilename().replace(/[^\w.\- ]+/g, "_") || `dce-${i}.zip`;
      const chemin = join(dossier, `${i}-${nom}`);
      await d.saveAs(chemin);
      chemins.push(chemin);
    }
    return chemins;
  } catch (e) {
    await journal(`échec : ${(e as Error).message}`).catch(() => undefined);
    throw e;
  } finally {
    await contexte.close();
  }
}

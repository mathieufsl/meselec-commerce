// Dépôt Lovable : c'est lui qui porte les secrets du robot.
const GITHUB_DEPOT = "mathieufsl/rms-commerce";
const GITHUB_WORKFLOW = "veille-dce.yml";

/**
 * Lance le robot DCE (workflow GitHub Actions). Le robot traite toutes les
 * annonces `analyse_statut = 'a_faire'`. Sans jeton GitHub, renvoie false :
 * les demandes sont alors reprises au passage planifié du matin.
 */
export async function lancerRobotDce(
  options: {
    collecte?: boolean;
    /** Veille manuelle : sources et critères (JSON lu par scripts/dce/run.ts). */
    parametres?: Record<string, unknown>;
  } = {},
): Promise<boolean> {
  const jeton = process.env["GITHUB_DISPATCH_TOKEN"];
  if (!jeton) return false;
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_DEPOT}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jeton}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "rms-commerce-veille",
      },
      // Pas d'annonce ciblée : le robot traite toutes les demandes en attente,
      // ce qui couvre plusieurs demandes rapprochées (une seule exécution à la fois).
      body: JSON.stringify({
        ref: "main",
        inputs: {
          collecte: options.collecte ? "true" : "false",
          ...(options.parametres ? { parametres: JSON.stringify(options.parametres) } : {}),
        },
      }),
    },
  );
  if (!res.ok) {
    console.error(`[veille-dce] GitHub ${res.status} : ${await res.text()}`);
    return false;
  }
  return true;
}

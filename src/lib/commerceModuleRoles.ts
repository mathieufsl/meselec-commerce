/** Modules et rôles ACL commerce (alignés RLS). */

export type CommerceModule =
  | "dashboard"
  | "appels_offres"
  | "ce"
  | "catalogues"
  | "fournisseurs"
  | "prospection"
  | "admin";

export type CommerceModuleRole = "rien" | "viewer" | "editor";

export const COMMERCE_MODULE_LABELS: Record<CommerceModule, string> = {
  dashboard: "Vue d'ensemble",
  appels_offres: "Appels d'offres",
  ce: "Croissance externe",
  catalogues: "Catalogues BPU",
  fournisseurs: "Fournisseurs",
  prospection: "Prospection",
  admin: "Administration",
};

export const COMMERCE_ALL_MODULES: CommerceModule[] = [
  "dashboard",
  "appels_offres",
  "ce",
  "catalogues",
  "fournisseurs",
  "prospection",
  "admin",
];

export const COMMERCE_MODULE_ROLE_LABELS: Record<CommerceModuleRole, string> = {
  rien: "Rien",
  viewer: "Lecteur",
  editor: "Éditeur",
};

export const COMMERCE_MODULE_ROLE_OPTIONS: CommerceModuleRole[] = ["rien", "viewer", "editor"];

export const COMMERCE_MODULE_BY_PATH: Record<string, CommerceModule> = {
  "/": "dashboard",
  "/appels-offres": "appels_offres",
  "/veille": "appels_offres",
  "/ce": "ce",
  "/catalogues": "catalogues",
  "/fournisseurs": "fournisseurs",
  "/prospection": "prospection",
  "/admin": "admin",
};

/** Chemins accessibles dès que l'utilisateur a un accès commerce (hors module). */
const MODULE_FREE_PATH_PREFIXES = ["/login", "/profil"];

export function isCommerceModuleFreePath(pathname: string): boolean {
  return MODULE_FREE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const MODULE_LANDING_PATH: Record<CommerceModule, string> = {
  dashboard: "/",
  appels_offres: "/appels-offres",
  ce: "/ce",
  catalogues: "/catalogues",
  fournisseurs: "/fournisseurs",
  prospection: "/prospection",
  admin: "/admin",
};

/** Première route autorisée (ordre nav), inspiré getAdminDefaultLandingPath suivi. */
export function getCommerceDefaultLandingPath(modules: CommerceModule[]): string {
  for (const module of COMMERCE_ALL_MODULES) {
    if (modules.includes(module)) return MODULE_LANDING_PATH[module];
  }
  return "/profil";
}

export type CommerceModuleRolesMap = Partial<Record<CommerceModule, CommerceModuleRole>>;

export function defaultFullCommerceModuleRoles(): Record<CommerceModule, CommerceModuleRole> {
  return Object.fromEntries(COMMERCE_ALL_MODULES.map((m) => [m, "editor"])) as Record<
    CommerceModule,
    CommerceModuleRole
  >;
}

export function normalizeCommerceModuleRoles(
  input: CommerceModuleRolesMap | Record<string, string> | null | undefined,
): Record<CommerceModule, CommerceModuleRole> {
  const result = defaultFullCommerceModuleRoles();
  for (const module of COMMERCE_ALL_MODULES) {
    result[module] = "rien";
  }
  if (!input || Object.keys(input).length === 0) {
    return result;
  }
  for (const module of COMMERCE_ALL_MODULES) {
    const raw = input[module];
    if (raw === "viewer" || raw === "editor") {
      result[module] = raw;
    } else if (raw === "rien" || raw == null || raw === "") {
      result[module] = "rien";
    } else {
      result[module] = "editor";
    }
  }
  return result;
}

/** Map RPC (empty = aucun ; full editor keys = accès total affiché). */
export function moduleRolesFromAccountRpc(
  moduleRoles: Record<string, string> | null | undefined,
): Record<CommerceModule, CommerceModuleRole> {
  if (!moduleRoles || Object.keys(moduleRoles).length === 0) {
    return normalizeCommerceModuleRoles({});
  }
  return normalizeCommerceModuleRoles(moduleRoles);
}

export function countActiveCommerceModules(
  moduleRoles: Record<CommerceModule, CommerceModuleRole>,
): number {
  return COMMERCE_ALL_MODULES.filter((m) => moduleRoles[m] !== "rien").length;
}

export function summarizeCommerceModules(
  moduleRoles: Record<CommerceModule, CommerceModuleRole>,
): string {
  const active = COMMERCE_ALL_MODULES.filter((m) => moduleRoles[m] !== "rien");
  if (active.length === 0) return "Aucun module";
  if (active.length === COMMERCE_ALL_MODULES.length) {
    const allEditor = active.every((m) => moduleRoles[m] === "editor");
    return allEditor ? "Tous (édition)" : "Tous";
  }
  return active
    .map((m) => {
      const role = moduleRoles[m];
      const label = COMMERCE_MODULE_LABELS[m];
      return role === "viewer" ? `${label} (L)` : label;
    })
    .join(", ");
}

export function commerceModuleForPath(pathname: string): CommerceModule | null {
  if (pathname === "/" || pathname === "") return "dashboard";
  const match = Object.entries(COMMERCE_MODULE_BY_PATH)
    .filter(([path]) => path !== "/")
    .find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  return match ? match[1] : null;
}

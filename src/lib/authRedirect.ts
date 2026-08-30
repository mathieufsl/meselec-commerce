/**
 * Utilitaires (purs, testables) pour la redirection après connexion
 * et la traduction des erreurs OAuth (Microsoft / Azure).
 */

export const REDIRECT_STORAGE_KEY = "rmscom.auth.redirect";

const DEFAULT_PATH = "/";

/**
 * N'accepte qu'un chemin interne sûr : commence par "/", pas "//" (origine externe),
 * pas de schéma, et jamais la page de login elle-même.
 */
export function sanitizeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/^\/+login(\/|\?|#|$)/.test(value)) return null;
  return value;
}

export function resolveRedirectTarget(raw: string | null | undefined): string {
  return sanitizeRedirectPath(raw) ?? DEFAULT_PATH;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveRedirectPath(path: string | null | undefined, storage?: StorageLike | null) {
  const target = sanitizeRedirectPath(path);
  const store = storage ?? safeStorage();
  if (!store) return;
  try {
    if (target) store.setItem(REDIRECT_STORAGE_KEY, target);
    else store.removeItem(REDIRECT_STORAGE_KEY);
  } catch {
    /* stockage indisponible : on retombe sur "/" */
  }
}

export function consumeRedirectPath(storage?: StorageLike | null): string {
  const store = storage ?? safeStorage();
  if (!store) return DEFAULT_PATH;
  try {
    const value = store.getItem(REDIRECT_STORAGE_KEY);
    store.removeItem(REDIRECT_STORAGE_KEY);
    return resolveRedirectTarget(value);
  } catch {
    return DEFAULT_PATH;
  }
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    "Connexion Microsoft refusée : vous avez annulé, ou l'administrateur du tenant doit approuver l'application.",
  consent_required:
    "L'application Microsoft nécessite l'approbation d'un administrateur Entra avant de pouvoir être utilisée.",
  interaction_required: "Microsoft demande une nouvelle authentification. Merci de réessayer.",
  invalid_request:
    "Requête OAuth invalide : vérifiez l'URL de redirection déclarée dans Microsoft Entra.",
  unauthorized_client:
    "Le provider Microsoft n'est pas activé côté Supabase (Authentication → Providers → Azure).",
  invalid_client: "Identifiants Microsoft invalides (Client ID ou secret expiré côté Supabase).",
  server_error: "Erreur temporaire du fournisseur d'identité. Merci de réessayer dans un instant.",
  temporarily_unavailable:
    "Service Microsoft temporairement indisponible. Merci de réessayer dans un instant.",
  provider_email_needs_verification:
    "Votre adresse Microsoft doit être vérifiée avant de pouvoir vous connecter.",
};

export type OAuthErrorInfo = { code: string; message: string };

/**
 * Supabase renvoie les erreurs OAuth soit en query string, soit dans le hash.
 * @param url URL complète de retour (window.location.href)
 */
export function parseOAuthError(url: string): OAuthErrorInfo | null {
  let search = "";
  let hash = "";
  try {
    const parsed = new URL(url, "http://localhost");
    search = parsed.search.replace(/^\?/, "");
    hash = parsed.hash.replace(/^#/, "");
  } catch {
    return null;
  }

  for (const part of [search, hash]) {
    if (!part) continue;
    const params = new URLSearchParams(part);
    const code = params.get("error_code") ?? params.get("error");
    if (!code) continue;
    const description = params.get("error_description");
    const known = OAUTH_ERROR_MESSAGES[code];
    const message =
      known ??
      (description ? description.replace(/\+/g, " ") : "Connexion Microsoft impossible.");
    return { code, message };
  }

  return null;
}

/** true si l'URL de retour contient un jeton de session OAuth/magic link. */
export function hasAuthCallbackTokens(url: string): boolean {
  try {
    const parsed = new URL(url, "http://localhost");
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    const query = parsed.searchParams;
    return Boolean(hash.get("access_token") || query.get("code"));
  } catch {
    return false;
  }
}

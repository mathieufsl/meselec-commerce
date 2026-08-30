import { describe, expect, it } from "vitest";
import {
  REDIRECT_STORAGE_KEY,
  consumeRedirectPath,
  hasAuthCallbackTokens,
  parseOAuthError,
  resolveRedirectTarget,
  sanitizeRedirectPath,
  saveRedirectPath,
} from "@/lib/authRedirect";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  };
}

describe("sanitizeRedirectPath", () => {
  it("accepte les chemins internes", () => {
    expect(sanitizeRedirectPath("/appels-offres")).toBe("/appels-offres");
    expect(sanitizeRedirectPath("/appels-offres/123?tab=docs")).toBe("/appels-offres/123?tab=docs");
    expect(sanitizeRedirectPath("/catalogues")).toBe("/catalogues");
  });

  it("rejette les cibles externes ou dangereuses", () => {
    expect(sanitizeRedirectPath("https://evil.com")).toBeNull();
    expect(sanitizeRedirectPath("//evil.com")).toBeNull();
    expect(sanitizeRedirectPath("/\\evil.com")).toBeNull();
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBeNull();
    expect(sanitizeRedirectPath("")).toBeNull();
    expect(sanitizeRedirectPath(null)).toBeNull();
  });

  it("ne renvoie jamais vers /login (boucle)", () => {
    expect(sanitizeRedirectPath("/login")).toBeNull();
    expect(sanitizeRedirectPath("/login?next=/admin")).toBeNull();
    expect(resolveRedirectTarget("/login")).toBe("/");
  });
});

describe("stockage de la redirection", () => {
  it("mémorise puis consomme une seule fois", () => {
    const store = memoryStorage();
    saveRedirectPath("/prospection", store);
    expect(store.getItem(REDIRECT_STORAGE_KEY)).toBe("/prospection");
    expect(consumeRedirectPath(store)).toBe("/prospection");
    expect(consumeRedirectPath(store)).toBe("/");
  });

  it("ignore une cible invalide", () => {
    const store = memoryStorage();
    saveRedirectPath("https://evil.com", store);
    expect(consumeRedirectPath(store)).toBe("/");
  });

  it("survit à un stockage indisponible", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => saveRedirectPath("/admin", broken)).not.toThrow();
    expect(consumeRedirectPath(broken)).toBe("/");
  });
});

describe("parseOAuthError", () => {
  it("traduit les erreurs connues envoyées dans le hash", () => {
    const info = parseOAuthError(
      "http://app.test/login#error=access_denied&error_code=access_denied&error_description=User+cancelled",
    );
    expect(info?.code).toBe("access_denied");
    expect(info?.message).toContain("refusée");
  });

  it("traduit les erreurs en query string", () => {
    expect(parseOAuthError("http://app.test/login?error=unauthorized_client")?.message).toContain(
      "Supabase",
    );
    expect(parseOAuthError("http://app.test/login?error=server_error")?.message).toContain(
      "temporaire",
    );
  });

  it("retombe sur la description brute pour un code inconnu", () => {
    const info = parseOAuthError("http://app.test/login?error=weird_thing&error_description=Boom+here");
    expect(info?.code).toBe("weird_thing");
    expect(info?.message).toBe("Boom here");
  });

  it("renvoie null sans erreur", () => {
    expect(parseOAuthError("http://app.test/login")).toBeNull();
    expect(parseOAuthError("http://app.test/#access_token=abc")).toBeNull();
  });
});

describe("hasAuthCallbackTokens", () => {
  it("détecte un retour de session", () => {
    expect(hasAuthCallbackTokens("http://app.test/login#access_token=abc&type=bearer")).toBe(true);
    expect(hasAuthCallbackTokens("http://app.test/login?code=xyz")).toBe(true);
    expect(hasAuthCallbackTokens("http://app.test/login")).toBe(false);
  });
});

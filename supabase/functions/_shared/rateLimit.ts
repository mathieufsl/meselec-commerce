const textEncoder = new TextEncoder();

export function getEnvBool(name: string, defaultValue = true): boolean {
  const raw = Deno.env.get(name);
  if (raw === undefined) return defaultValue;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return defaultValue;
}

export function getClientIp(req: Request): string {
  const h = req.headers;
  const candidates = [
    h.get("x-forwarded-for") ?? "",
    h.get("x-real-ip") ?? "",
    h.get("cf-connecting-ip") ?? "",
    h.get("x-supabase-client-ip") ?? "",
  ];

  for (const c of candidates) {
    const trimmed = c.trim();
    if (!trimmed) continue;
    const first = trimmed.split(",")[0]?.trim();
    if (first) return first;
  }

  const host = h.get("host") ?? "";
  return host ? `unknown-ip@${host}` : "unknown-ip";
}

export type RateLimitOptions = {
  prefix: string;
  limit: number;
  windowMs: number;
  identifier?: string;
  corsHeaders: Record<string, string>;
  identifierMode?: "ip" | "authorization";
};

export type RateLimitResponse = {
  response: Response;
  limit: number;
  remaining: number;
  resetAt: number;
};

const counters = new Map<string, { count: number; expiresAt: number }>();

export async function enforceRateLimit(
  req: Request,
  options: RateLimitOptions,
): Promise<RateLimitResponse | null> {
  const enabled = getEnvBool("EDGE_RATE_LIMIT_ENABLED", true);
  if (!enabled) return null;
  if (req.method === "OPTIONS") return null;

  const limit = Math.max(1, Math.floor(options.limit));
  const windowMs = Math.max(1000, Math.floor(options.windowMs));

  const identifier =
    options.identifier ??
    (() => {
      if (options.identifierMode === "authorization") {
        const auth = req.headers.get("authorization") ?? "";
        return auth ? `auth:${auth}` : getClientIp(req);
      }
      return getClientIp(req);
    })();

  const now = Date.now();
  const key = `${options.prefix}:${identifier}`;

  const existing = counters.get(key);
  if (existing && existing.expiresAt <= now) {
    counters.delete(key);
  }

  const entry = counters.get(key);
  const count = (entry?.count ?? 0) + 1;
  const expiresAt = entry?.expiresAt ?? now + windowMs;
  counters.set(key, { count, expiresAt });

  if (count > limit) {
    const retryAfterSec = Math.ceil((expiresAt - now) / 1000);
    return {
      response: new Response(JSON.stringify({ success: false, error: "Too many requests" }), {
        status: 429,
        headers: {
          ...options.corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(expiresAt / 1000)),
          "Retry-After": String(retryAfterSec),
        },
      }),
      limit,
      remaining: 0,
      resetAt: expiresAt,
    };
  }

  void textEncoder;
  return null;
}

import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

/**
 * Récapitulatif quotidien de veille AO (planifié à 10h, heure de Paris, via pg_cron).
 * Le jeton porteur est stocké dans `public.cron_config` (généré en base, jamais exposé) :
 * la route le compare à celui fourni dans l'en-tête Authorization.
 */
async function authenticateCron(request: Request, supabaseAdmin: any): Promise<boolean> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return false;

  const { data, error } = await supabaseAdmin
    .from("cron_config")
    .select("value")
    .eq("key", "veille_cron_token")
    .maybeSingle();
  if (error || !data?.value) return false;

  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
  return timingSafeEqual(digest(token), digest(String(data.value)));
}

export const Route = createFileRoute("/api/public/cron/veille-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (!(await authenticateCron(request, supabaseAdmin))) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { collecterVeille } = await import("@/lib/veilleCollect.server");

        const collecte = await collecterVeille(supabaseAdmin, {
          fenetreJours: 1,
          idfSeulement: true,
        });
        if (!collecte.ok) {
          return Response.json(collecte, { status: 502 });
        }

        const { data: recipients, error } = await supabaseAdmin
          .from("veille_email_recipients")
          .select("email, nom")
          .eq("actif", true);
        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const dateLabel = new Date().toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Europe/Paris",
        });
        const dateKey = new Date().toISOString().slice(0, 10);
        const annonces = collecte.annoncesNouvelles.map((a) => ({
          intitule: a.intitule,
          acheteur: a.acheteur,
          departement: a.departement,
          date_limite: a.date_limite,
          lien: a.lien,
          domaines: a.domaines,
        }));

        const templateData = {
          date: dateLabel,
          annonces,
          collectees: collecte.collectees,
          retenues: collecte.retenues,
          appUrl: "https://commerce.rmsenergies.com/veille",
        };

        let sent = 0;
        let suppressed = 0;
        let failed = 0;
        for (const r of recipients ?? []) {
          try {
            const out = await sendTemplateEmail("veille-recap", r.email, {
              templateData,
              idempotencyKey: `veille-recap-${dateKey}-${r.email}`,
            });
            if (out.sent) sent += 1;
            else suppressed += 1;
          } catch (e) {
            failed += 1;
            console.error("[veille-daily] send failed:", e instanceof Error ? e.message : e);
          }
        }

        return Response.json({
          ok: true,
          nouvelles: annonces.length,
          destinataires: (recipients ?? []).length,
          sent,
          suppressed,
          failed,
        });
      },
    },
  },
});

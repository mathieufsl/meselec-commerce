import * as React from "react";
import { render } from "@react-email/render";
import { createFileRoute } from "@tanstack/react-router";
import { TEMPLATES } from "@/lib/email-templates/registry";

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
const FROM = "RMS Commerce <veille@meselec.fr>";

/**
 * Récapitulatif quotidien de veille AO (planifié à 10h, heure de Paris, via pg_cron).
 * Le jeton porteur est stocké dans `public.cron_config` (généré en base, jamais exposé) :
 * la route le compare à celui fourni dans l'en-tête Authorization.
 * L'envoi passe par Resend (connecteur gateway) avec le domaine vérifié meselec.fr.
 */
async function sendVeilleEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) {
    return { ok: false, status: 500, error: "Configuration e-mail manquante" };
  }
  const res = await fetch(`${RESEND_GATEWAY}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[veille-daily] Resend error [${res.status}]: ${body}`);
    return { ok: false, status: res.status, error: body };
  }
  return { ok: true, status: res.status };
}
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

        const entry = TEMPLATES["veille-recap"];
        if (!entry) {
          return Response.json({ ok: false, error: "Template introuvable" }, { status: 500 });
        }
        const element = React.createElement(entry.component, templateData);
        const html = await render(element);
        const subject =
          typeof entry.subject === "function" ? entry.subject(templateData) : entry.subject;

        let sent = 0;
        let failed = 0;
        for (const r of recipients ?? []) {
          const out = await sendVeilleEmail(r.email, subject, html);
          if (out.ok) sent += 1;
          else failed += 1;
        }

        return Response.json({
          ok: failed === 0,
          nouvelles: annonces.length,
          destinataires: (recipients ?? []).length,
          sent,
          failed,
        });
      },
    },
  },
});

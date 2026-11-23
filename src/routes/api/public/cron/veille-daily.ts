import * as React from "react";
import { render } from "@react-email/render";
import { createFileRoute } from "@tanstack/react-router";
import { TEMPLATES } from "@/lib/email-templates/registry";
import type { VeilleRecapAnnonce } from "@/lib/email-templates/veille-recap";
import type { VeilleAnalyse } from "@/lib/veilleAnalyse";

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
    .in("key", ["veille_cron_token", "veille_cron_token_test"]);
  if (error || !data || data.length === 0) return false;

  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
  const provided = digest(token);
  return data.some((row: { value: string }) =>
    timingSafeEqual(provided, digest(String(row.value))),
  );
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

        // Options facultatives (renvoi manuel) : fenêtre de collecte et inclusion
        // des annonces déjà connues sur la période.
        let opts: { fenetreJours?: number; inclureExistantes?: boolean } = {};
        try {
          opts = (await request.json()) as typeof opts;
        } catch {
          opts = {};
        }
        const fenetreJours = Math.min(Math.max(opts.fenetreJours ?? 1, 1), 30);

        const collecte = await collecterVeille(supabaseAdmin, {
          fenetreJours,
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

        // Qualification IA des nouvelles annonces (le mail part même si elle échoue).
        let qualifIndisponible = false;
        try {
          const { qualifierAnnonces } = await import("@/lib/veilleQualif.server");
          // Tout ce qui attend : nouvelles annonces de cette collecte et celles
          // ramenées plus tôt par le robot DCE du matin.
          const q = await qualifierAnnonces(supabaseAdmin, { limit: 200 });
          if (!q.ok || (q.traitees > 0 && q.qualifiees === 0)) qualifIndisponible = true;
          if (q.dceDemandes > 0) {
            const { lancerRobotDce } = await import("@/lib/veilleDce.server");
            await lancerRobotDce();
          }
        } catch (e) {
          console.error("[veille-daily] qualification:", e);
          qualifIndisponible = true;
        }

        const dateLabel = new Date().toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Europe/Paris",
        });

        // Annonces arrivées depuis le dernier mail (24 h), qu'elles viennent de
        // cette collecte, du robot DCE du matin ou d'une collecte manuelle.
        const { pointsRecap } = await import("@/lib/veilleAnalyse");
        const depuis = opts.inclureExistantes
          ? new Date(Date.now() - fenetreJours * 86400000).toISOString().slice(0, 10)
          : null;
        let requete = supabaseAdmin
          .from("veille_annonces")
          .select(
            "source, intitule, acheteur, departement, date_limite, lien, domaines, url_dce, analyse_dce, analyse_statut, avis_indices, entite, decision, score, resume, certif_manquante, interet_relationnel, exigences, plateforme, dce_url, qualif_statut",
          )
          // Seulement ce qui reste à trier : une annonce déjà ignorée ou envoyée
          // dans les AO depuis l'écran Veille ne revient pas dans le mail.
          .eq("statut", "nouveau")
          .order("date_parution", { ascending: false });
        requete = depuis
          ? requete.gte("date_parution", depuis)
          : requete.gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
        const { data: rows, error: rowsErr } = await requete;
        if (rowsErr) {
          return Response.json({ ok: false, error: rowsErr.message }, { status: 500 });
        }
        type LigneRecap = VeilleRecapAnnonce & {
          domaines: string[] | null;
          analyse_dce: VeilleAnalyse | null;
          analyse_statut: string | null;
          avis_indices: NonNullable<Parameters<typeof pointsRecap>[0]["avis_indices"]> | null;
        };
        const annonces: VeilleRecapAnnonce[] = ((rows ?? []) as unknown as LigneRecap[]).map(
          ({ analyse_dce, analyse_statut, avis_indices, ...r }) => ({
            ...r,
            domaines: (r.domaines ?? []) as string[],
            points: pointsRecap({ analyse_dce, analyse_statut, avis_indices }),
          }),
        );

        const templateData = {
          date: dateLabel,
          annonces,
          qualifIndisponible,
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

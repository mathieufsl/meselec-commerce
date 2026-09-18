import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/commerce/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CeMoneyInput } from "@/components/commerce/CeMoneyInput";
import { useCeDossier, useUpsertCeDossier } from "@/hooks/useCeData";
import { useCommerceAuth } from "@/hooks/useCommerceAuth";
import { isFormDirty, toForm, toPayload, type CeDetailFormState } from "@/lib/ceDetailForm";
import {
  CE_SITUATION_LABELS,
  CE_SITUATIONS,
  CE_STATUT_LABELS,
  CE_STATUTS,
  type CeSituationJuridique,
  type CeStatut,
} from "@/lib/commerceTypes";
import { cleanDisplaySeparators } from "@/lib/displayText";

export const Route = createFileRoute("/ce/$dossierId")({
  component: CeDetailPage,
});

function CeDetailPage() {
  const { dossierId } = Route.useParams();
  const navigate = useNavigate();
  const { hasEditorAccess } = useCommerceAuth();
  const canEdit = hasEditorAccess("ce");
  const { data: dossier } = useCeDossier(dossierId);
  const upsert = useUpsertCeDossier();

  const [form, setForm] = useState<CeDetailFormState | null>(null);
  const [baseline, setBaseline] = useState<CeDetailFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isDirty = useMemo(
    () => (form && baseline ? isFormDirty(baseline, form) : false),
    [form, baseline],
  );

  useEffect(() => {
    if (!dossier) return;
    if (isDirty) return;
    const next = toForm(dossier);
    setForm(next);
    setBaseline(next);
  }, [dossier, isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function patch(next: Partial<CeDetailFormState>) {
    setForm((f) => (f ? { ...f, ...next } : f));
  }

  async function handleSave() {
    if (!dossier || !form) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload = toPayload(form);
      await upsert.mutateAsync({ id: dossier.id, ...payload });
      const fresh = toForm({ ...dossier, ...payload });
      setBaseline(fresh);
      setForm(fresh);
      setMsg("Fiche enregistrée.");
    } catch (err) {
      setMsg(`Échec : ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function navigateBackToList() {
    if (
      isDirty &&
      !window.confirm("Des modifications ne sont pas enregistrées. Quitter cette fiche ?")
    ) {
      return;
    }
    void navigate({ to: "/ce" });
  }

  if (!dossier || !form) {
    return (
      <AppShell title="Dossier CE">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={cleanDisplaySeparators(dossier.nom_cible)}
      subtitle={dossier.reference}
      back={{ to: "/ce", label: "Retour liste", onNavigate: navigateBackToList }}
      flush
      contentClassName="flex min-h-0 flex-col px-3 py-3 sm:px-6 sm:py-4"
      mobileFooter={
        canEdit ? (
          <div className="flex items-center gap-2 px-3 py-2">
            {isDirty ? (
              <span className="shrink-0 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">
                Non enregistré
              </span>
            ) : null}
            <Button
              size="sm"
              className="min-w-0 flex-1"
              onClick={() => void handleSave()}
              disabled={!isDirty || saving}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        ) : undefined
      }
      actions={
        canEdit ? (
          <div className="hidden items-center gap-2 lg:flex">
            {isDirty ? (
              <span className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                Non enregistré
              </span>
            ) : null}
            <Button size="sm" onClick={() => void handleSave()} disabled={!isDirty || saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        ) : (
          <span className="hidden text-xs text-muted-foreground lg:inline">Lecture seule</span>
        )
      }
    >
      {msg ? (
        <p className="mb-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">{msg}</p>
      ) : null}

      <div className="min-w-0 flex-1 space-y-6 pb-4 lg:space-y-8 lg:pb-12">
        <Panel title="Identification" bodyClassName="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Référence">
              <Input value={dossier.reference} disabled className="bg-muted/40" />
            </Field>
            <Field label="Raison sociale *">
              <Input
                value={form.nom_cible}
                onChange={(e) => patch({ nom_cible: e.target.value })}
              />
            </Field>
            <Field label="Activité">
              <Input
                value={form.activite}
                onChange={(e) => patch({ activite: e.target.value })}
              />
            </Field>
            <Field label="Lieu">
              <Input value={form.lieu} onChange={(e) => patch({ lieu: e.target.value })} />
            </Field>
          </div>
        </Panel>

        <Panel title="Situation & pipeline" bodyClassName="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Situation juridique">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.situation_juridique}
                onChange={(e) =>
                  patch({ situation_juridique: e.target.value as CeSituationJuridique })
                }
              >
                {CE_SITUATIONS.map((s) => (
                  <option key={s} value={s}>
                    {CE_SITUATION_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Statut pipeline">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.statut}
                onChange={(e) => patch({ statut: e.target.value as CeStatut })}
              >
                {CE_STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {CE_STATUT_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            {form.situation_juridique === "redressement" ? (
              <Field label="Date échéance offre *">
                <Input
                  type="date"
                  value={form.date_echeance_offre}
                  onChange={(e) => patch({ date_echeance_offre: e.target.value })}
                />
              </Field>
            ) : null}
          </div>
        </Panel>

        <Panel title="Chiffres clés" bodyClassName="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="CA estimé (€)">
              <CeMoneyInput
                value={form.ca_estime}
                onChange={(v) => patch({ ca_estime: v })}
              />
            </Field>
            <Field label="EBITDA estimé (€)">
              <CeMoneyInput
                value={form.ebitda_estime}
                onChange={(v) => patch({ ebitda_estime: v })}
              />
            </Field>
            <Field label="Valorisation (€)">
              <CeMoneyInput
                value={form.valorisation_estimee}
                onChange={(v) => patch({ valorisation_estimee: v })}
              />
            </Field>
            <Field label="Effectif">
              <Input
                type="number"
                value={form.effectif}
                onChange={(e) => patch({ effectif: e.target.value })}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Organisation" bodyClassName="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Interlocuteur">
              <Input
                value={form.interlocuteur}
                onChange={(e) => patch({ interlocuteur: e.target.value })}
              />
            </Field>
            <div className="hidden sm:block" />
            <Field label="Date de détection">
              <Input
                type="date"
                value={form.date_detection}
                onChange={(e) => patch({ date_detection: e.target.value })}
              />
            </Field>
            <Field label="Closing cible">
              <Input
                type="date"
                value={form.date_closing_cible}
                onChange={(e) => patch({ date_closing_cible: e.target.value })}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Notes" bodyClassName="space-y-2">
          <Textarea
            value={form.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            rows={5}
            placeholder="Notes de suivi, points d’attention…"
          />
        </Panel>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

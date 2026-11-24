import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Resultat = {
  ok: boolean;
  code?: string;
  error?: string;
  cree?: boolean;
  dossier?: string | null;
  envoyes?: number;
  echecs?: string[];
};

/**
 * Crée le dossier SharePoint de l'AO (AO/1_Non traité/<date>/<VILLE>_<SECTEURS>) si besoin et y
 * envoie les documents de l'AO qui n'y sont pas encore. Ne bloque jamais l'action en cours :
 * les erreurs sont signalées par un toast, et rien n'est affiché tant que SharePoint n'est pas
 * configuré côté Supabase.
 */
export async function synchroniserDossierSharepoint(
  aoId: string,
  { creer = false, silencieux = false }: { creer?: boolean; silencieux?: boolean } = {},
): Promise<Resultat> {
  let res: Resultat;
  try {
    const { data, error } = await supabase.functions.invoke("ao-sharepoint-dossier", {
      body: { aoId, creer },
    });
    if (error) {
      // Le corps de la réponse d'erreur porte le message utile.
      const ctx = (error as { context?: Response }).context;
      const corps = ctx ? await ctx.json().catch(() => null) : null;
      res = { ok: false, error: corps?.error ?? error.message };
    } else {
      res = data as Resultat;
    }
  } catch (e) {
    res = { ok: false, error: (e as Error).message };
  }

  if (res.code === "non_configure") return res;
  if (!res.ok) {
    if (!silencieux) toast.error(`SharePoint : ${res.error ?? "erreur inconnue"}`);
    return res;
  }
  if (res.cree) {
    toast.success(
      res.envoyes
        ? `Dossier SharePoint créé avec ${res.envoyes} document(s)`
        : "Dossier SharePoint créé dans « 1_Non traité »",
    );
  } else if (res.envoyes && !silencieux) {
    toast.success(`${res.envoyes} document(s) envoyé(s) sur SharePoint`);
  }
  if (res.echecs?.length) toast.error(`Non envoyés sur SharePoint : ${res.echecs.join(" · ")}`);
  return res;
}

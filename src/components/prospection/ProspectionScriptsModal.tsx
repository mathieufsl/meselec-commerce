import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function scriptHtml(ville: string, agglo: string) {
  const aggloTxt = agglo ? `à <strong>${agglo}</strong>` : "à l'agglomération";
  return `
    <div class="rounded-lg border bg-muted px-3 py-2 text-[11px] text-muted-foreground mb-3 font-medium">
      Identité : DUT Technico-Commercial · IUT de Cergy · Projet tutoré 2024-2025
    </div>
    <div class="rounded-lg border-l-4 border-l-primary bg-muted/60 px-3 py-2 text-xs leading-relaxed mb-2">
      <span class="block text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">Étape 1 - Standard mairie</span>
      Bonjour, je m'appelle [Prénom], je suis étudiante en DUT Technico-Commercial à l'Université de Cergy. Dans le cadre de mon projet de fin d'études, je réalise une étude sur la gestion de l'éclairage public dans les communes des Yvelines. Pourriez-vous me mettre en relation avec le service technique${ville ? ` de <strong>${ville}</strong>` : ""}, s'il vous plaît ?
    </div>
    <div class="rounded-lg border-l-4 border-l-primary bg-muted/60 px-3 py-2 text-xs leading-relaxed mb-2">
      <span class="block text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">Étape 2 - Qualifier qui gère l'EP</span>
      Bonjour. Je suis étudiante en DUT Technico-Commercial à l'Université de Cergy-Pontoise. Je travaille sur mon projet tutoré : <em>« L'organisation de la gestion de l'éclairage public dans les communes des Yvelines »</em>.<br><br>
      Pour mon étude, est-ce que l'éclairage public est géré directement par la commune${ville ? ` de <strong>${ville}</strong>` : ""}, ou bien c'est transféré ${aggloTxt} ou à un syndicat d'énergie ?
    </div>
    <div class="rounded-lg border-l-4 border-l-primary bg-muted/60 px-3 py-2 text-xs leading-relaxed mb-2">
      <span class="block text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">Étape 3 - Obtenir le nom du prestataire</span>
      Dans mon étude, j'analyse quelle entreprise assure la maintenance du réseau d'éclairage. Mon directeur de projet me demande de cartographier les prestataires qui interviennent dans le 78.<br><br>
      Pourriez-vous me dire quel est le prestataire privé qui gère l'éclairage public sur votre commune en ce moment ?
    </div>
    <div class="rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2 text-[11px] text-warning mt-3">
      Toujours rester dans le registre <strong>étudiant</strong>. Ne jamais mentionner MESELEC.
    </div>`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ville?: string | undefined;
  agglo?: string | undefined;
  maire?: string | undefined;
};

export function ProspectionScriptsModal({ open, onOpenChange, ville = "", agglo = "", maire = "" }: Props) {
  const title = ville ? `Script - ${ville}` : "Scripts d'appel - Guide complet";
  const subtitle = ville ? `${agglo || "Commune"} · Maire : ${maire}` : "DUT TC · IUT Cergy · Projet tutoré 2024-2025";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,100%)] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogHeader className="shrink-0 space-y-1 border-b px-4 pb-3 pt-4 pr-12 text-left">
          <DialogTitle className="break-words text-base leading-snug sm:text-lg">{title}</DialogTitle>
          <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
        </DialogHeader>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
          dangerouslySetInnerHTML={{ __html: scriptHtml(ville, agglo) }}
        />
      </DialogContent>
    </Dialog>
  );
}

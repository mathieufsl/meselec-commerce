import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Loader2, ScanSearch, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSecondes } from "@/hooks/useSecondes";
import { ajouterPieceDceAuxDocumentsAo } from "@/lib/aoDocuments";
import { cn } from "@/lib/utils";
import { analyseEnCours, type VeilleAnnonceRow } from "@/lib/veille";
import { debuterActivite, finirActivite } from "@/lib/veilleSuivi";

type FichierDepose = { nom: string; taille: number };

function tailleLisible(octets: number) {
  return octets >= 1024 * 1024
    ? `${(octets / 1024 / 1024).toFixed(1)} Mo`
    : `${Math.max(1, Math.round(octets / 1024))} Ko`;
}

/**
 * Dépôt manuel du DCE (RC, CCTP, ZIP…) quand le robot ne peut pas le télécharger.
 * Les fichiers s'ajoutent dans `veille-dce/<annonce>/depot/` (en une ou plusieurs
 * fois), puis l'analyse est lancée à la demande : le robot lit ces pièces.
 * Sur la fiche d'un AO (`aoId`), chaque pièce est aussi rangée dans ses documents.
 */
export function VeilleDepotDce({
  a,
  onAnalyser,
  aoId,
}: {
  a: VeilleAnnonceRow;
  onAnalyser: (a: VeilleAnnonceRow) => void;
  aoId?: string;
}) {
  const qc = useQueryClient();
  const dossier = `${a.id}/depot`;
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const secondes = useSecondes(envoi != null);

  const { data: fichiers = [], isLoading } = useQuery({
    queryKey: ["veille-depot", a.id],
    queryFn: async (): Promise<FichierDepose[]> => {
      const { data, error } = await supabase.storage.from("veille-dce").list(dossier);
      if (error) throw error;
      return (data ?? [])
        .filter((f) => f.name && !f.name.startsWith("."))
        .map((f) => ({ nom: f.name, taille: Number(f.metadata?.["size"] ?? 0) }));
    },
  });
  const rafraichir = () => qc.invalidateQueries({ queryKey: ["veille-depot", a.id] });

  async function deposer(liste: FileList | null) {
    const nouveaux = Array.from(liste ?? []);
    if (!nouveaux.length || envoi) return;
    setErreur(null);
    const tropGros = nouveaux.find((f) => f.size > 50 * 1024 * 1024);
    if (tropGros) {
      setErreur(`${tropGros.name} dépasse 50 Mo (limite par fichier).`);
      return;
    }
    let echec = false;
    try {
      for (const [i, f] of nouveaux.entries()) {
        debuterActivite(
          a.id,
          "depot",
          `Envoi de fichiers${nouveaux.length > 1 ? ` ${i + 1}/${nouveaux.length}` : ""}`,
        );
        setEnvoi(
          `Envoi de ${f.name} (${tailleLisible(f.size)})${nouveaux.length > 1 ? ` · ${i + 1}/${nouveaux.length}` : ""}`,
        );
        const nom = f.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
        const { error } = await supabase.storage
          .from("veille-dce")
          .upload(
            `${dossier}/${nom}`,
            f,
            f.type ? { upsert: true, contentType: f.type } : { upsert: true },
          );
        if (error) throw new Error(`${f.name} : ${error.message}`);
        if (aoId) {
          await ajouterPieceDceAuxDocumentsAo({ aoId, nom: f.name, fichier: f }).catch(
            (e: unknown) => {
              throw new Error(
                `${f.name} : déposé pour l'analyse mais pas rangé dans les documents de l'AO (${e instanceof Error ? e.message : "échec"})`,
              );
            },
          );
        }
      }
    } catch (e) {
      echec = true;
      setErreur(e instanceof Error ? e.message : "Dépôt impossible");
    } finally {
      finirActivite(a.id, "depot", echec ? "erreur" : "pret");
      setEnvoi(null);
      if (input.current) input.current.value = "";
      void rafraichir();
      if (aoId) {
        void qc.invalidateQueries({ queryKey: ["ao-documents", aoId] });
        void qc.invalidateQueries({ queryKey: ["ao-document-counts"] });
      }
    }
  }

  async function supprimer(nom: string) {
    const { error } = await supabase.storage.from("veille-dce").remove([`${dossier}/${nom}`]);
    if (error) setErreur(`${nom} : ${error.message}`);
    void rafraichir();
  }

  const robotEnCours = analyseEnCours(a);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSurvol(false);
        void deposer(e.dataTransfer.files);
      }}
      className={cn(
        "mt-3 space-y-2 rounded-lg border border-dashed px-3 py-2.5 text-xs transition-colors",
        survol ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 flex-1 text-muted-foreground">
          {aoId
            ? "Glisse ici le RC, le CCTP, la DPGF (Excel) ou le ZIP, en une ou plusieurs fois : ils sont rangés dans les documents de l'AO et lus par l'analyse."
            : "DCE téléchargé toi-même ? Glisse ici le RC, le CCTP, la DPGF (Excel) ou le ZIP, en une ou plusieurs fois, puis lance l'analyse."}
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.zip,.7z,.rar,.doc,.docx,.odt,.xlsx,.xlsm,.xls,.ods,.csv"
          className="hidden"
          onChange={(e) => void deposer(e.target.files)}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={envoi != null}
          onClick={() => input.current?.click()}
        >
          {fichiers.length ? "Ajouter des fichiers" : "Choisir des fichiers"}
        </Button>
      </div>

      {envoi ? (
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          <span className="min-w-0 truncate">{envoi}</span>
          <span className="tabular-nums">{secondes} s</span>
        </p>
      ) : null}
      {erreur ? <p className="text-destructive">{erreur}</p> : null}

      {isLoading ? null : fichiers.length ? (
        <>
          <ul className="space-y-1">
            {fichiers.map((f) => (
              <li
                key={f.nom}
                className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1 text-foreground"
              >
                <FileDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate" title={f.nom}>
                  {f.nom}
                </span>
                {f.taille ? (
                  <span className="tabular-nums text-muted-foreground">
                    {tailleLisible(f.taille)}
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Retirer ${f.nom}`}
                  disabled={robotEnCours}
                  onClick={() => void supprimer(f.nom)}
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={envoi != null || robotEnCours}
              onClick={() => onAnalyser(a)}
            >
              <ScanSearch className="mr-1 h-3.5 w-3.5" />
              Analyser ces {fichiers.length} fichier{fichiers.length > 1 ? "s" : ""}
            </Button>
            {robotEnCours ? (
              <span className="text-muted-foreground">Analyse en cours : suivi ci-dessus.</span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";

/** pdf.js et son worker, chargés à la demande (navigateur uniquement). */
async function chargerPdfJs() {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

/**
 * Une page dessinée sur un canvas à la largeur du conteneur, seulement quand elle
 * approche de l'écran : un DCE de 200 pages reste fluide au défilement.
 */
function PdfPage({
  pdf,
  numero,
  largeur,
  ratio,
}: {
  pdf: PDFDocumentProxy;
  numero: number;
  largeur: number;
  ratio: number;
}) {
  const boite = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [dessinee, setDessinee] = useState(false);

  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entree]) => {
        if (entree?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !largeur) return;
    let annule = false;
    let tache: { cancel: () => void } | null = null;
    void (async () => {
      const page = await pdf.getPage(numero);
      if (annule || !canvas.current) return;
      const base = page.getViewport({ scale: 1 });
      // Netteté sur écran Retina, plafonnée pour ne pas saturer la mémoire du téléphone.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (largeur / base.width) * dpr });
      const c = canvas.current;
      c.width = Math.floor(viewport.width);
      c.height = Math.floor(viewport.height);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const rendu = page.render({ canvas: c, canvasContext: ctx, viewport });
      tache = rendu;
      try {
        await rendu.promise;
        if (!annule) setDessinee(true);
      } catch {
        // Rendu annulé (page quittée) : rien à faire.
      }
    })();
    return () => {
      annule = true;
      tache?.cancel();
    };
  }, [visible, pdf, numero, largeur]);

  return (
    <div
      ref={boite}
      className="relative mx-auto bg-white shadow-sm"
      style={{ width: largeur, height: largeur * ratio }}
    >
      <canvas ref={canvas} className="block h-full w-full" />
      {!dessinee ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {numero}
        </div>
      ) : null}
    </div>
  );
}

/** Lecteur PDF défilant (toutes les pages), pour les mobiles où l'iframe n'affiche qu'une page. */
export function PdfPagesViewer({ src }: { src: string }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [ratios, setRatios] = useState<number[]>([]);
  const [largeur, setLargeur] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    let tache: { destroy: () => Promise<void> } | null = null;
    void (async () => {
      try {
        const pdfjs = await chargerPdfJs();
        const chargement = pdfjs.getDocument({ url: src });
        tache = chargement;
        const doc = await chargement.promise;
        if (annule) return;
        // Format de chaque page (hauteur / largeur) pour réserver la place avant le rendu.
        const r: number[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const v = (await doc.getPage(i)).getViewport({ scale: 1 });
          r.push(v.height / v.width);
        }
        if (annule) return;
        setRatios(r);
        setPdf(doc);
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "PDF illisible.");
      }
    })();
    return () => {
      annule = true;
      void tache?.destroy();
    };
  }, [src]);

  useEffect(() => {
    const el = conteneur.current;
    if (!el) return;
    const maj = () => setLargeur(Math.max(0, el.clientWidth - 16));
    maj();
    const obs = new ResizeObserver(maj);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={conteneur}
      // La fiche AO ouverte en dessous (Sheet Radix) verrouille le défilement de la
      // page et peut avaler la molette ou le doigt hors de sa propre couche : on
      // garde ces événements ici, le navigateur fait défiler le lecteur normalement.
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      tabIndex={0}
      className="absolute inset-0 overflow-y-auto overscroll-contain bg-muted/40 px-2 py-2 outline-none [-webkit-overflow-scrolling:touch]"
    >
      {erreur ? (
        <p className="p-6 text-center text-sm text-destructive">{erreur}</p>
      ) : !pdf ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {ratios.map((ratio, i) => (
            <PdfPage key={i} pdf={pdf} numero={i + 1} largeur={largeur} ratio={ratio} />
          ))}
        </div>
      )}
    </div>
  );
}

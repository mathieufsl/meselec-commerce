import { useEffect, useState } from "react";
import { FolderOpen, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Accès au dossier SharePoint de l'AO. Sans lien enregistré, le bouton ouvre la saisie du lien
 * (éditeurs uniquement) ; avec un lien, il l'ouvre dans un nouvel onglet.
 */
export function AoSharepointButton({
  url,
  canEdit,
  onSave,
  saving = false,
  compact = false,
}: {
  url: string | null | undefined;
  canEdit: boolean;
  onSave: (url: string | null) => Promise<void>;
  saving?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(url ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(url ?? "");
      setError(null);
    }
  }, [open, url]);

  if (!url && !canEdit) return null;

  async function submit(next: string | null) {
    const value = next?.trim() || null;
    if (value && !/^https?:\/\//i.test(value)) {
      setError("Le lien doit commencer par https://");
      return;
    }
    try {
      await onSave(value);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const label = <span className={cn(compact && "sr-only")}>SharePoint</span>;
  const iconClass = cn("h-4 w-4", !compact && "mr-1.5");
  const buttonClass = cn(compact && "h-9 w-9 shrink-0 p-0");

  const editor = (
    <PopoverContent align="end" className="w-80 space-y-2">
      <p className="text-sm font-medium">Dossier SharePoint de l&apos;AO</p>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(draft);
        }}
      >
        <Input
          type="url"
          autoFocus
          placeholder="https://…sharepoint.com/…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          {url ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={saving}
              onClick={() => void submit(null)}
            >
              Retirer
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </PopoverContent>
  );

  if (!url) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className={buttonClass} title="Ajouter le lien SharePoint">
            <FolderOpen className={iconClass} />
            {label}
          </Button>
        </PopoverTrigger>
        {editor}
      </Popover>
    );
  }

  return (
    <div className="flex items-center">
      <Button
        size="sm"
        variant="outline"
        className={cn(buttonClass, canEdit && "rounded-r-none")}
        asChild
      >
        <a href={url} target="_blank" rel="noreferrer" title="Ouvrir le dossier SharePoint">
          <FolderOpen className={iconClass} />
          {label}
        </a>
      </Button>
      {canEdit ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className={cn("rounded-l-none border-l-0 px-2", compact && "h-9")}
              title="Modifier le lien SharePoint"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Modifier le lien SharePoint</span>
            </Button>
          </PopoverTrigger>
          {editor}
        </Popover>
      ) : null}
    </div>
  );
}

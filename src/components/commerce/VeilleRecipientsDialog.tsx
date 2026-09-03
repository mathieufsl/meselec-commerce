import { useState } from "react";
import { Loader2, Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  useAddVeilleRecipient,
  useDeleteVeilleRecipient,
  useUpdateVeilleRecipient,
  useVeilleRecipients,
} from "@/hooks/useVeille";

export function VeilleRecipientsDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const { data: recipients = [], isLoading } = useVeilleRecipients();
  const add = useAddVeilleRecipient();
  const update = useUpdateVeilleRecipient();
  const remove = useDeleteVeilleRecipient();

  function ajouter() {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Adresse e-mail invalide");
      return;
    }
    add.mutate(
      { email: value, nom },
      {
        onSuccess: () => {
          setEmail("");
          setNom("");
          toast.success("Destinataire ajouté");
        },
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : "Ajout impossible"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="whitespace-nowrap">
          <Mail className="mr-1.5 h-4 w-4" />
          Destinataires
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Récapitulatif quotidien</DialogTitle>
          <DialogDescription>
            Chaque jour à 10h00 (heure de Paris), la veille est relancée et un e-mail récapitulatif
            des nouvelles annonces est envoyé aux destinataires actifs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            inputMode="email"
            placeholder="prenom.nom@rmsenergies.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ajouter();
            }}
          />
          <Input
            placeholder="Nom (optionnel)"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="sm:w-40"
          />
          <Button onClick={ajouter} disabled={add.isPending} className="shrink-0">
            {add.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {isLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Chargement…</p>
          ) : recipients.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun destinataire configuré.
            </p>
          ) : (
            recipients.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.email}</p>
                  {r.nom ? (
                    <p className="truncate text-xs text-muted-foreground">{r.nom}</p>
                  ) : null}
                </div>
                <Switch
                  checked={r.actif}
                  onCheckedChange={(actif) => update.mutate({ id: r.id, actif })}
                  aria-label="Activer ce destinataire"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(r.id)}
                  aria-label="Supprimer ce destinataire"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

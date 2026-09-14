import { useEffect, useRef, useState } from "react";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import {
  CONTACT_TYPE_OPTIONS,
  contactsEqual,
  createEmptyContact,
  createMaireContact,
  type ProspectionContact,
  type ProspectionContactType,
} from "@/lib/prospection/contacts";
import {
  GESTION_OPTIONS,
  STATUS_OPTIONS,
  aggloBadgeClass,
  statusSelectClass,
} from "@/lib/prospection/ui";
import { departementShortLabel, nuanceBadgeClass } from "@/lib/prospection/crmUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { FileText, Mail, Phone, Plus, Trash2, UserPlus } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commune: ProspectionCommune | null;
  row: ProspectionCommuneState;
  isDirty: boolean;
  onPatch: (communeKey: string, patch: Partial<ProspectionCommuneState>) => void;
  onOpenScript: (target: { ville: string; agglo: string; maire: string }) => void;
};

export function ProspectionCommuneDetailSheet({
  open,
  onOpenChange,
  commune,
  row,
  isDirty,
  onPatch,
  onOpenScript,
}: Props) {
  const isMobile = useIsMobile();
  const [contacts, setContacts] = useState(row.contacts);
  const [prestataire, setPrestataire] = useState(row.prestataire);
  const [notes, setNotes] = useState(row.notes);
  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;

  useEffect(() => {
    setContacts(row.contacts);
    setPrestataire(row.prestataire);
    setNotes(row.notes);
  }, [row.contacts, row.prestataire, row.notes, commune?.key]);

  if (!commune) return null;

  const ville = commune.ville;
  const communeKey = commune.key;
  const hasMaireContact = contacts.some((c) => c.type === "maire");

  const commitTextFields = () => {
    const patch: Partial<ProspectionCommuneState> = {};
    if (prestataire !== row.prestataire) patch.prestataire = prestataire;
    if (notes !== row.notes) patch.notes = notes;
    if (Object.keys(patch).length > 0) onPatch(communeKey, patch);
  };

  const commitContacts = (next: ProspectionContact[]) => {
    setContacts(next);
    contactsRef.current = next;
    if (!contactsEqual(next, row.contacts)) {
      onPatch(communeKey, { contacts: next });
    }
  };

  const commitContactsFromLocal = () => {
    const next = contactsRef.current;
    if (!contactsEqual(next, row.contacts)) {
      onPatch(communeKey, { contacts: next });
    }
  };

  const updateContactField = (
    id: string,
    field: "nom" | "telephone" | "email",
    value: string,
  ) => {
    setContacts((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, [field]: value } : c));
      contactsRef.current = next;
      return next;
    });
  };

  const updateContactType = (id: string, type: ProspectionContactType) => {
    commitContacts(contactsRef.current.map((c) => (c.id === id ? { ...c, type } : c)));
  };

  const removeContact = (id: string) => {
    commitContacts(contactsRef.current.filter((c) => c.id !== id));
  };

  const addMaire = () => {
    if (hasMaireContact || !commune.maire.trim()) return;
    commitContacts([
      ...contactsRef.current,
      createMaireContact({
        nom: commune.maire,
        telephone: commune.telephone,
        email: commune.email,
      }),
    ]);
  };

  const addContact = (type: ProspectionContactType = "dst") => {
    commitContacts([...contactsRef.current, createEmptyContact(type)]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex w-full flex-col gap-0 overflow-hidden p-0",
          isMobile
            ? "max-h-[min(92dvh,100%)] rounded-t-2xl border-t"
            : "h-full sm:max-w-md",
        )}
      >
        {isMobile ? (
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-md bg-muted-foreground/25" />
        ) : null}

        <SheetHeader className="shrink-0 space-y-1 border-b px-4 pb-3 pt-4 text-left sm:pr-12">
          <SheetTitle className="break-words pr-8 text-base leading-snug sm:pr-0 sm:text-lg">
            {ville}
          </SheetTitle>
          <SheetDescription className="text-left text-xs sm:text-sm">
            {commune.departement} · {commune.habitants.toLocaleString("fr")} habitants
            {isDirty ? (
              <span className="mt-1 block font-medium text-warning">
                Modifications non enregistrées
              </span>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Agglomération
              </Label>
              <p
                className={cn(
                  "inline-block max-w-full rounded-md px-2.5 py-1 text-xs font-semibold leading-snug",
                  aggloBadgeClass(commune.agglo),
                )}
              >
                {commune.agglo || "N/A"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Département
                </Label>
                <p className="text-sm font-medium">{departementShortLabel(commune.departement)}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Nuance
                </Label>
                {commune.nuance ? (
                  <span
                    className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-xs font-semibold",
                      nuanceBadgeClass(commune.nuance),
                    )}
                  >
                    {commune.nuance}
                  </span>
                ) : (
                  <p className="text-sm"></p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Maire
              </Label>
              <p className="text-sm font-medium leading-snug">{commune.maire}</p>
            </div>

            {commune.telephone ? (
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Standard mairie
                </Label>
                <a
                  href={`tel:${commune.telephone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {commune.telephone}
                </a>
              </div>
            ) : null}

            {commune.email ? (
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Email
                </Label>
                <a
                  href={`mailto:${commune.email}`}
                  className="flex items-center gap-2 break-all text-sm font-medium text-primary hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {commune.email}
                </a>
              </div>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prospection-gestion">Qui gère l&apos;éclairage public ?</Label>
              <Select
                value={row.gestion || "__none__"}
                onValueChange={(v) =>
                  onPatch(communeKey, {
                    gestion: (v === "__none__" ? "" : v) as ProspectionCommuneState["gestion"],
                  })
                }
              >
                <SelectTrigger id="prospection-gestion" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GESTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value || "__none__"} value={o.value || "__none__"}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prospection-status">Statut de l&apos;appel</Label>
              <Select
                value={row.status}
                onValueChange={(v) =>
                  onPatch(communeKey, { status: v as ProspectionCommuneState["status"] })
                }
              >
                <SelectTrigger
                  id="prospection-status"
                  className={cn("h-10 w-full", statusSelectClass(row.status))}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prospection-prestataire">Prestataire EP</Label>
              <Input
                id="prospection-prestataire"
                value={prestataire}
                placeholder="ex: Spie Citéos"
                onChange={(e) => setPrestataire(e.target.value)}
                onBlur={commitTextFields}
                className={cn(
                  "h-10 w-full",
                  prestataire && "border-success/30 bg-success-subtle font-semibold text-success",
                )}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Contacts</Label>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={hasMaireContact || !commune.maire.trim()}
                    onClick={addMaire}
                    title={
                      hasMaireContact
                        ? "Le maire est déjà dans les contacts"
                        : "Préremplir avec le maire et le standard mairie"
                    }
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    Maire
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => addContact("dst")}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Contact
                  </Button>
                </div>
              </div>

              {contacts.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                  Aucun contact. Ajoutez le maire ou un contact (DST, technique…).
                </p>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact, index) => (
                    <div
                      key={contact.id}
                      className="space-y-2 rounded-lg border bg-background p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Select
                          value={contact.type}
                          onValueChange={(v) =>
                            updateContactType(contact.id, v as ProspectionContactType)
                          }
                        >
                          <SelectTrigger
                            aria-label={`Type du contact ${index + 1}`}
                            className="h-9 w-[8.5rem] shrink-0"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_TYPE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={contact.nom}
                          placeholder="Nom"
                          onChange={(e) => updateContactField(contact.id, "nom", e.target.value)}
                          onBlur={commitContactsFromLocal}
                          className="h-9 min-w-0 flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                          title="Supprimer le contact"
                          onClick={() => removeContact(contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          value={contact.telephone}
                          placeholder="Téléphone"
                          onChange={(e) =>
                            updateContactField(contact.id, "telephone", e.target.value)
                          }
                          onBlur={commitContactsFromLocal}
                          className="h-9"
                        />
                        <Input
                          value={contact.email}
                          placeholder="Email"
                          onChange={(e) => updateContactField(contact.id, "email", e.target.value)}
                          onBlur={commitContactsFromLocal}
                          className="h-9"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prospection-notes">Notes / fin de marché</Label>
              <Textarea
                id="prospection-notes"
                value={notes}
                placeholder="Notes, date de fin de marché…"
                rows={4}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={commitTextFields}
                className="min-h-[6rem] w-full resize-y"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() =>
              onOpenScript({ ville, agglo: commune.agglo, maire: commune.maire })
            }
          >
            <FileText className="mr-2 h-4 w-4 shrink-0" />
            Voir le script d&apos;appel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

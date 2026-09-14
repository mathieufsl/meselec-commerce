export const PROSPECTION_CONTACT_TYPES = [
  "maire",
  "dst",
  "elu",
  "technique",
  "autre",
] as const;

export type ProspectionContactType = (typeof PROSPECTION_CONTACT_TYPES)[number];

export type ProspectionContact = {
  id: string;
  type: ProspectionContactType;
  nom: string;
  telephone: string;
  email: string;
};

export const CONTACT_TYPE_OPTIONS: { value: ProspectionContactType; label: string }[] = [
  { value: "maire", label: "Maire" },
  { value: "dst", label: "DST" },
  { value: "elu", label: "Élu" },
  { value: "technique", label: "Technique" },
  { value: "autre", label: "Autre" },
];

export function contactTypeLabel(type: ProspectionContactType): string {
  return CONTACT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function createEmptyContact(
  type: ProspectionContactType = "autre",
  seed?: Partial<Pick<ProspectionContact, "nom" | "telephone" | "email">>,
): ProspectionContact {
  return {
    id: crypto.randomUUID(),
    type,
    nom: seed?.nom ?? "",
    telephone: seed?.telephone ?? "",
    email: seed?.email ?? "",
  };
}

export function createMaireContact(seed: {
  nom: string;
  telephone?: string;
  email?: string;
}): ProspectionContact {
  return createEmptyContact("maire", {
    nom: seed.nom.trim(),
    telephone: seed.telephone?.trim() ?? "",
    email: seed.email?.trim() ?? "",
  });
}

function isContactType(value: unknown): value is ProspectionContactType {
  return (
    typeof value === "string" &&
    (PROSPECTION_CONTACT_TYPES as readonly string[]).includes(value)
  );
}

export function parseContactsJson(raw: unknown): ProspectionContact[] {
  if (!Array.isArray(raw)) return [];
  const out: ProspectionContact[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const type = isContactType(row.type) ? row.type : "autre";
    const nom = typeof row.nom === "string" ? row.nom : "";
    const telephone = typeof row.telephone === "string" ? row.telephone : "";
    const email = typeof row.email === "string" ? row.email : "";
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id
        : crypto.randomUUID();
    out.push({ id, type, nom, telephone, email });
  }
  return out;
}

/** Hydrate contacts from JSON, falling back to legacy free-text `contact`. */
export function hydrateContacts(
  contactsJson: unknown,
  legacyContact: string | null | undefined,
): ProspectionContact[] {
  const fromJson = parseContactsJson(contactsJson);
  if (fromJson.length > 0) return fromJson;
  const legacy = (legacyContact ?? "").trim();
  if (!legacy) return [];
  return [createEmptyContact("autre", { nom: legacy })];
}

export function formatContactLine(contact: ProspectionContact): string {
  const details = [contact.nom.trim() || null, contact.telephone.trim() || null].filter(Boolean);
  if (details.length === 0) return contactTypeLabel(contact.type);
  return `${contactTypeLabel(contact.type)} · ${details.join(" · ")}`;
}

/** Compact summary for table / CSV / dirty-check (kept in `contact` column). */
export function summarizeContacts(contacts: ProspectionContact[]): string {
  return contacts
    .map((c) => formatContactLine(c))
    .filter(Boolean)
    .join(" | ");
}

export function contactsEqual(a: ProspectionContact[], b: ProspectionContact[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((left, i) => {
    const right = b[i];
    return (
      left.id === right.id &&
      left.type === right.type &&
      left.nom === right.nom &&
      left.telephone === right.telephone &&
      left.email === right.email
    );
  });
}

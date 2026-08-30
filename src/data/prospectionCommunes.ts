import { CRM_COMMUNES } from "./crmCommunes";

export type ProspectionCommune = {
  key: string;
  departement: string;
  ville: string;
  habitants: number;
  agglo: string;
  maire: string;
  nuance: string;
  telephone: string;
  email: string;
};

/** Toutes les communes IDF issues du référentiel CRM (même source que l'onglet CRM Communes). */
export const PROSPECTION_COMMUNES: ProspectionCommune[] = CRM_COMMUNES.map(
  ({ key, departement, ville, habitants, agglo, maire, nuance, telephone, email }) => ({
    key,
    departement,
    ville,
    habitants,
    agglo,
    maire,
    nuance,
    telephone,
    email,
  }),
).sort((a, b) => b.habitants - a.habitants);

export const PROSPECTION_DEPARTEMENTS = [
  ...new Set(PROSPECTION_COMMUNES.map((c) => c.departement)),
].sort();

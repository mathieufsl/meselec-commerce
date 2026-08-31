export type MeselecAppId = "suivi" | "commerce" | "finance" | "renovation";

export type MeselecApp = {
  id: MeselecAppId;
  label: string;
  shortLabel: string;
  href: string;
};

function envUrl(key: string, fallback: string): string {
  const raw = import.meta.env[key] as string | undefined;
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/\/$/, "");
}

export const CURRENT_MESELEC_APP_ID: MeselecAppId = "commerce";

export function getMeselecApps(): MeselecApp[] {
  return [
    {
      id: "suivi",
      label: "Meselec Suivi",
      shortLabel: "Suivi",
      href: envUrl("VITE_SUIVI_APP_URL", "http://localhost:8080"),
    },
    {
      id: "commerce",
      label: "RMSCom",
      shortLabel: "Com",
      href: envUrl("VITE_COMMERCE_APP_URL", "http://localhost:8081"),
    },
    {
      id: "finance",
      label: "RMSFin",
      shortLabel: "Fin",
      href: envUrl("VITE_FINANCE_APP_URL", "http://localhost:8082"),
    },
    {
      id: "renovation",
      label: "RMSRenov",
      shortLabel: "Renov",
      href: envUrl("VITE_RENOVATION_APP_URL", "http://localhost:8083"),
    },
  ];
}

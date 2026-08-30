import type { User } from "@supabase/supabase-js";

export function getPrenom(user: { user_metadata?: Record<string, unknown>; email?: string } | null): string {
  if (!user) return "";
  const meta = user.user_metadata as Record<string, string> | undefined;
  if (meta?.["first_name"]) return meta["first_name"];
  if (meta?.["full_name"]) return meta["full_name"].split(/\s+/)[0] || "";
  if (user.email) {
    const part = user.email.split("@")[0]?.split(".")[0];
    return part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : "";
  }
  return "Profil";
}

export function userDisplayName(user: User | null): string {
  return getPrenom(user);
}

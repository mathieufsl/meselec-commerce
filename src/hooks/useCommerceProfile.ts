import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CommerceProfile {
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
}

export function useCommerceProfile(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["commerce-profile", userId],
    queryFn: async (): Promise<CommerceProfile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("commerce_profiles")
        .select("prenom, nom, telephone")
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        prenom: data.prenom ?? null,
        nom: data.nom ?? null,
        telephone: data.telephone ?? null,
      };
    },
    enabled: !!userId,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
  });

  const profile = query.data ?? null;
  const displayName = profile?.prenom || profile?.nom
    ? [profile?.prenom, profile?.nom].filter(Boolean).join(" ").trim()
    : null;

  return {
    profile,
    displayName,
    loading: query.isPending && !!userId,
    refetch: query.refetch,
  };
}

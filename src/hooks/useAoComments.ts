import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AoComment = {
  id: string;
  ao_id: string;
  author_user_id: string;
  author_prenom: string;
  author_nom: string;
  body: string;
  created_at: string;
};

function commentsKey(aoId: string) {
  return ["ao-comments", aoId] as const;
}

export function useAoComments(aoId: string | null, enabled = true) {
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: commentsKey(aoId ?? ""),
    queryFn: async () => {
      if (!aoId) return [];
      const { data, error } = await supabase.rpc("get_ao_comments", {
        p_ao_id: aoId,
        p_limit: 50,
      });
      if (error) throw error;
      return ((data ?? []) as Partial<AoComment>[]).map((row) => ({
        id: String(row.id ?? ""),
        ao_id: String(row.ao_id ?? aoId),
        author_user_id: String(row.author_user_id ?? ""),
        author_prenom: row.author_prenom ?? "",
        author_nom: row.author_nom ?? "",
        body: row.body ?? "",
        created_at: row.created_at ?? new Date().toISOString(),
      }));
    },
    enabled: enabled && !!aoId,
  });

  const postMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!aoId) throw new Error("AO manquant");
      const { data, error } = await supabase.rpc("post_ao_comment", {
        p_ao_id: aoId,
        p_body: body,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      if (aoId) void queryClient.invalidateQueries({ queryKey: commentsKey(aoId) });
    },
  });

  return {
    comments: commentsQuery.data ?? [],
    loading: commentsQuery.isPending,
    posting: postMutation.isPending,
    postComment: postMutation.mutateAsync,
  };
}

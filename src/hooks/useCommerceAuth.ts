import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useCommerceAuth() {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setBooting(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setBooting(false);
      void qc.invalidateQueries();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  const accessQuery = useQuery({
    queryKey: ["commerce-has-access", session?.user?.id],
    enabled: Boolean(session?.user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("commerce_has_access");
      if (error) throw error;
      return Boolean(data);
    },
  });

  return {
    session,
    user: session?.user ?? null,
    booting,
    hasAccess: accessQuery.data ?? false,
    checkingAccess: accessQuery.isLoading && Boolean(session),
    signOut: () => supabase.auth.signOut(),
  };
}

export { userDisplayName } from "@/lib/userDisplay";

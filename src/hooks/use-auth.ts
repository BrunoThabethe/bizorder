import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearAllAdminOtpFlags } from "@/components/admin/AdminOtpGate";
import { cacheTiers, queryKeys } from "@/lib/cache";

export type AppRole = "customer" | "business" | "admin" | "crew";

type AuthState = {
  session: Session | null;
  user: Session["user"] | null;
  role: AppRole | null;
  loading: boolean;
};

/**
 * Auth state hook.
 *
 * The session itself is tracked in local component state (driven by Supabase's
 * onAuthStateChange stream), but the role lookup is cached in React Query so
 * every layout/page that mounts shares a single answer instead of re-querying.
 * Role data lives in the "stable" tier — it rarely changes within a session.
 */
export const useAuth = (): AuthState => {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setSessionReady(true);
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        clearAllAdminOtpFlags();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: queryKeys.authRole(userId),
    enabled: !!userId,
    ...cacheTiers.stable,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_primary_role", { _user_id: userId as string });
      if (error) throw error;
      return (data as AppRole) ?? null;
    },
  });

  const loading = !sessionReady || (!!userId && roleLoading);

  return {
    session,
    user: session?.user ?? null,
    role: userId ? (role ?? null) : null,
    loading,
  };
};

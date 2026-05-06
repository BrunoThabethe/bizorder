import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearAllAdminOtpFlags } from "@/components/admin/AdminOtpGate";

export type AppRole = "customer" | "business" | "admin" | "crew";

type AuthState = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
};

export const useAuth = (): AuthState => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async (userId: string) => {
      const { data } = await supabase.rpc("get_primary_role", { _user_id: userId });
      setRole((data as AppRole) ?? null);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        // Force admins to re-verify OTP on every fresh sign-in / sign-out, on every device.
        clearAllAdminOtpFlags();
      }
      if (newSession?.user) {
        setLoading(true);
        setTimeout(() => {
          void fetchRole(newSession.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user) {
        fetchRole(existing.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, role, loading };
};

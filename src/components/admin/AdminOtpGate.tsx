import { ReactNode, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

// Per-session: we tie the verification flag to the current access token.
// A new login (any device) issues a new token, so OTP is required again every time.
const STORAGE_PREFIX = "admin_otp_ok::";

const tokenKey = (token: string | undefined): string | null =>
  token ? `${STORAGE_PREFIX}${token.slice(-32)}` : null;

export const isAdminOtpVerified = (accessToken: string | undefined): boolean => {
  const key = tokenKey(accessToken);
  if (!key) return false;
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

export const markAdminOtpVerified = (accessToken: string | undefined): void => {
  const key = tokenKey(accessToken);
  if (!key) return;
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
};

export const clearAllAdminOtpFlags = (): void => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
      if (k && k.startsWith("admin_otp_ok_")) keys.push(k); // legacy keys
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};

type AdminOtpGateProps = { children: ReactNode };

const INACTIVITY_MS = 5 * 60 * 1000;

export const AdminOtpGate = ({ children }: AdminOtpGateProps) => {
  const { loading, session, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const timerRef = useRef<number | null>(null);
  const tokenRef = useRef<string | undefined>(session?.access_token);

  useEffect(() => {
    setReady(true);
  }, []);

  // Sign out completely if the admin navigates away from any /admin route.
  useEffect(() => {
    if (!ready || loading) return;
    if (role !== "admin") return;
    if (!location.pathname.startsWith("/admin")) {
      clearAllAdminOtpFlags();
      void supabase.auth.signOut();
      navigate("/login", { replace: true });
    }
  }, [location.pathname, role, ready, loading, navigate]);

  // Inactivity watchdog — 5 min with no input clears the OTP flag and forces re-verify.
  useEffect(() => {
    if (!session || role !== "admin") return;
    tokenRef.current = session.access_token;

    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        const key = tokenRef.current;
        if (!key) return;
        try {
          sessionStorage.removeItem(`${STORAGE_PREFIX}${key.slice(-32)}`);
        } catch {
          /* ignore */
        }
        toast({
          title: "Session locked",
          description: "You were inactive for 5 minutes. Please verify again.",
        });
        navigate("/admin/verify", { replace: true, state: { from: location.pathname } });
      }, INACTIVITY_MS);
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [session, role, navigate, toast, location.pathname]);

  if (loading || !ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || role !== "admin") return <Navigate to="/login" replace />;

  if (!isAdminOtpVerified(session.access_token)) {
    return <Navigate to="/admin/verify" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

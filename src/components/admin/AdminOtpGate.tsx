import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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

export const AdminOtpGate = ({ children }: AdminOtpGateProps) => {
  const { loading, session, role } = useAuth();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

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

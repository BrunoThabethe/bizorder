import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const otpKey = (userId: string) => `admin_otp_ok_${userId}`;

export const isAdminOtpVerified = (userId: string): boolean => {
  try {
    return sessionStorage.getItem(otpKey(userId)) === "1";
  } catch {
    return false;
  }
};

export const markAdminOtpVerified = (userId: string): void => {
  try {
    sessionStorage.setItem(otpKey(userId), "1");
  } catch {
    /* ignore */
  }
};

export const clearAdminOtpVerified = (userId: string): void => {
  try {
    sessionStorage.removeItem(otpKey(userId));
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

  if (!isAdminOtpVerified(session.user.id)) {
    return <Navigate to="/admin/verify" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

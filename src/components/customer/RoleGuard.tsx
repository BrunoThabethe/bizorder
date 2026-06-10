import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";

type RoleGuardProps = {
  allow: AppRole[];
  children: ReactNode;
};

export const RoleGuard = ({ allow, children }: RoleGuardProps) => {
  const { loading, session, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Fail-closed: if role hasn't loaded or isn't allowed, redirect.
  if (!role) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allow.includes(role)) {
    const home =
      role === "admin"
        ? "/admin"
        : role === "business"
          ? "/business"
          : role === "crew"
            ? "/crew"
            : "/customer";
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

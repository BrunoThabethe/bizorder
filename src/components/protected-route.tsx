import { Navigate } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

type Props = {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
};

export const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const target = role === "admin" ? "/admin" : role === "business" ? "/business" : "/dashboard";
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};

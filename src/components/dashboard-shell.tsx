import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Props = { title: string; children: React.ReactNode };

export const DashboardShell = ({ title, children }: Props) => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="bg-gradient-primary inline-block h-7 w-7 rounded-lg shadow-glow" />
            <span className="font-display text-lg font-bold">BizOrder</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm md:block">
              <div className="font-medium">{user?.email}</div>
              <div className="text-xs uppercase tracking-wider text-primary">{role}</div>
            </div>
            <Button variant="glass" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-10">
        <h1 className="mb-8 text-3xl font-bold">{title}</h1>
        {children}
      </main>
    </div>
  );
};

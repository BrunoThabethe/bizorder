import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Props = { children: ReactNode };

export const CrewLayout = ({ children }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const initials =
    (user?.user_metadata?.full_name as string | undefined)
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "C";
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? "Crew";

  const onSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-4 p-3 md:p-5">
        <header className="flex items-center justify-between rounded-3xl bg-card px-4 py-3 shadow-card md:px-5">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground">
              <Zap className="h-5 w-5 text-background" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-bold">Crew portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-2xl bg-muted px-2 py-1.5 sm:flex">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-foreground text-xs text-background">{initials}</AvatarFallback>
              </Avatar>
              <span className="pr-2 text-sm font-semibold">{displayName}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={onSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

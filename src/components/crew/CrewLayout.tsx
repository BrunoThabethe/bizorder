import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, Briefcase, Home, LogOut, Menu, User, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = { children: ReactNode };

const navItems = [
  { to: "/crew", label: "Dashboard", icon: Home, end: true },
  { to: "/crew/tasks", label: "My tasks", icon: Briefcase },
  { to: "/crew/notifications", label: "Alerts", icon: Bell },
  { to: "/crew/profile", label: "Profile", icon: User },
];

export const CrewLayout = ({ children }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <div className="mx-auto flex max-w-[1400px] gap-4 p-3 md:p-5">
        <aside className="hidden w-16 shrink-0 flex-col items-center gap-2 rounded-3xl bg-card py-5 shadow-card md:flex">
          <span className="grid h-10 w-10 place-items-center">
            <BrandMark size={40} />
          </span>
          <nav className="mt-4 flex flex-1 flex-col items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  cn(
                    "grid h-11 w-11 place-items-center rounded-xl transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <item.icon className="h-5 w-5" />
              </NavLink>
            ))}
          </nav>
          <button
            onClick={onSignOut}
            title="Sign out"
            className="grid h-11 w-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex items-center gap-3 rounded-3xl bg-card px-4 py-3 shadow-card md:px-5">
            <button
              className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-foreground md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex flex-1 items-center gap-2">
              <span className="font-display text-lg font-bold">Crew portal</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Assigned work only
              </span>
            </div>
            <NavLink
              to="/crew/notifications"
              className="relative grid h-10 w-10 place-items-center rounded-xl bg-muted text-foreground hover:bg-muted/70"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </NavLink>
            <div className="hidden items-center gap-3 rounded-2xl bg-muted px-2 py-1.5 sm:flex">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <span className="pr-2 text-sm font-semibold">{displayName}</span>
            </div>
          </header>

          <main className="flex-1 pb-24 md:pb-0">{children}</main>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-1 bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandMark size={36} />
                <span className="font-display text-lg font-bold">Crew portal</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
                    isActive ? "bg-primary text-primary-foreground shadow-glow" : "text-foreground hover:bg-muted",
                  )
                }
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </NavLink>
            ))}
            <Button variant="secondary" className="mt-4 justify-start" onClick={onSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </aside>
        </div>
      )}

      <nav className="fixed bottom-3 left-3 right-3 z-40 flex items-center justify-around rounded-3xl bg-card px-2 py-2 shadow-card md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "grid h-11 w-11 place-items-center rounded-2xl transition-colors",
                isActive ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground",
              )
            }
            aria-label={item.label}
          >
            <item.icon className="h-5 w-5" />
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

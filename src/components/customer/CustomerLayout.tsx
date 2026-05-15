import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Compass,
  Home,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  Search,
  Settings,
  Star,
  Menu,
  X,
  
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { BrandMark } from "@/components/BrandMark";

type CustomerLayoutProps = { children: ReactNode };

const navItems = [
  { to: "/customer", label: "Dashboard", icon: Home, end: true },
  { to: "/customer/browse", label: "Browse", icon: Compass },
  { to: "/customer/orders", label: "Orders", icon: Package },
  { to: "/customer/messages", label: "Messages", icon: MessageSquare },
  { to: "/customer/addresses", label: "Addresses", icon: MapPin },
  { to: "/customer/reviews", label: "Reviews", icon: Star },
  { to: "/customer/notifications", label: "Alerts", icon: Bell },
  { to: "/customer/settings", label: "Settings", icon: Settings },
];

export const CustomerLayout = ({ children }: CustomerLayoutProps) => {
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
      .toUpperCase() ?? "U";
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? "Customer";

  const onSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1600px] gap-4 p-3 md:p-5">
        {/* Desktop sidebar */}
        <aside className="hidden w-16 shrink-0 flex-col items-center gap-2 rounded-3xl bg-card py-5 shadow-card md:flex">
          <NavLink to="/" className="grid h-10 w-10 place-items-center">
            <BrandMark size={40} />
          </NavLink>
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

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Top bar */}
          <header className="flex items-center gap-3 rounded-3xl bg-card px-4 py-3 shadow-card md:px-5">
            <button
              className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-foreground md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search businesses, services, orders…"
                className="h-11 rounded-2xl border-0 bg-muted pl-11 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-foreground/20"
              />
            </div>
            <NavLink
              to="/customer/notifications"
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

          {/* Content */}
          <main className="flex-1 pb-24 md:pb-0">{children}</main>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-1 bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandMark size={36} />
                <span className="font-display text-lg font-bold">BizOrder</span>
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

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-3 left-3 right-3 z-40 flex items-center justify-around rounded-3xl bg-card px-2 py-2 shadow-card md:hidden">
        {navItems.slice(0, 5).map((item) => (
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

import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Bot,
  Briefcase,
  FileEdit,
  FileWarning,
  Home,
  Inbox,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  Wallet,
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

type Props = { children: ReactNode };

const navItems = [
  { to: "/admin", label: "Dashboard", icon: Home, end: true },
  { to: "/admin/orders", label: "Orders", icon: Inbox },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/businesses", label: "Businesses", icon: Briefcase },
  { to: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { to: "/admin/change-requests", label: "Change requests", icon: FileEdit },
  { to: "/admin/disputes", label: "Disputes", icon: FileWarning },
  { to: "/admin/payouts", label: "Payouts", icon: Wallet },
  { to: "/admin/uploads", label: "Uploads", icon: Upload },
  { to: "/admin/analytics", label: "Analytics", icon: Activity },
  { to: "/admin/ai-assistant", label: "AI Assistant", icon: Bot },
  { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { to: "/admin/audit", label: "Audit logs", icon: Activity },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export const AdminLayout = ({ children }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? "Admin";
  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1700px] gap-4 p-3 md:p-5">
        <aside className="hidden w-60 shrink-0 flex-col gap-1 rounded-3xl bg-card p-4 shadow-card md:flex">
          <NavLink to="/" className="mb-3 flex items-center gap-2 px-2">
            <BrandMark size={36} />
            <span className="font-display text-lg font-bold">Admin</span>
          </NavLink>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-accent/15 hover:text-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </NavLink>
            ))}
          </nav>
          <Button variant="secondary" className="mt-2 justify-start" onClick={onSignOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
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
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders, users, businesses…"
                className="h-11 rounded-2xl border-0 bg-muted pl-11 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-foreground/20"
              />
            </div>
            <button
              className="relative grid h-10 w-10 place-items-center rounded-xl bg-muted text-foreground hover:bg-accent/15 hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-3 rounded-2xl bg-muted px-2 py-1.5 sm:flex">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <span className="pr-2 text-sm font-semibold">{fullName}</span>
            </div>
          </header>

          <main className="flex-1 pb-24 md:pb-0">{children}</main>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-1 overflow-y-auto bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandMark size={36} />
                <span className="font-display text-lg font-bold">Admin</span>
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
                    isActive ? "bg-primary text-primary-foreground shadow-glow" : "text-foreground hover:bg-accent/15",
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
    </div>
  );
};

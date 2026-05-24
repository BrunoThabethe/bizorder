import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type PendingPreview = {
  id: string;
  field: string;
  requested_value: string;
  current_value: string | null;
  business_id: string | null;
  target_user_id: string | null;
  submitted_by: string;
  reason: string | null;
  created_at: string;
  who: string;
};

const fetchPendingChangeRequestsPreview = async (): Promise<PendingPreview[]> => {
  const { data, error } = await supabase
    .from("profile_change_requests")
    .select("id, field, requested_value, current_value, business_id, target_user_id, submitted_by, reason, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error || !data) return [];
  const rows = data as Array<Omit<PendingPreview, "who">>;

  const userIds = Array.from(new Set(rows.map((r) => r.submitted_by).filter(Boolean)));
  const bizIds = Array.from(new Set(rows.map((r) => r.business_id).filter((v): v is string => !!v)));

  const [{ data: profiles }, { data: businesses }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null }> }),
    bizIds.length
      ? supabase.from("businesses").select("id, name").in("id", bizIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }> }),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const bizById = new Map((businesses ?? []).map((b) => [b.id, b]));

  return rows.map((r) => {
    const biz = r.business_id ? bizById.get(r.business_id) : undefined;
    const p = profileById.get(r.submitted_by);
    const who = biz?.name ?? p?.full_name ?? p?.email ?? "Unknown";
    return { ...r, who };
  });
};



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
  { to: "/admin/ai-assistant", label: "AI Newsletter", icon: Bot },
  { to: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { to: "/admin/audit", label: "Audit logs", icon: Activity },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export const AdminLayout = ({ children }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["admin-change-requests-preview"],
    queryFn: fetchPendingChangeRequestsPreview,
    refetchInterval: 30_000,
  });
  const pendingCount = pendingRequests.length;

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
                      : "text-muted-foreground hover:bg-primary/15 hover:text-primary",
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
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative grid h-10 w-10 place-items-center rounded-xl bg-muted text-foreground hover:bg-primary/15 hover:text-primary"
                  aria-label={`Notifications${pendingCount > 0 ? `, ${pendingCount} pending change requests` : ""}`}
                >
                  <Bell className="h-5 w-5" />
                  {pendingCount > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-glow">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  ) : null}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <p className="text-sm font-semibold">Pending change requests</p>
                  <span className="text-xs text-muted-foreground">{pendingCount} open</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {pendingCount === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
                  ) : (
                    pendingRequests.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => navigate("/admin/change-requests")}
                        className="block w-full border-b px-4 py-3 text-left last:border-b-0 hover:bg-primary/10"
                      >
                        <p className="truncate text-sm font-semibold">{r.who}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Wants to change <span className="font-semibold text-foreground">{r.field}</span> →{" "}
                          <span className="text-foreground">{r.requested_value}</span>
                        </p>
                        <p className="mt-0.5 truncate text-xs italic text-muted-foreground">
                          {r.reason?.trim() ? `“${r.reason}”` : "No reason provided"}
                        </p>
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t p-2">
                  <Button variant="secondary" className="w-full justify-center" onClick={() => navigate("/admin/change-requests")}>
                    View all
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

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
                    isActive ? "bg-primary text-primary-foreground shadow-glow" : "text-foreground hover:bg-primary/15 hover:text-primary",
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

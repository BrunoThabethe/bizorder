import { DashboardShell } from "@/components/dashboard-shell";
import { Package, Inbox, Users } from "lucide-react";

const stats = [
  { label: "Products", value: "0", icon: Package },
  { label: "Pending orders", value: "0", icon: Inbox },
  { label: "Crew members", value: "0", icon: Users },
];

const BusinessDashboard = () => (
  <DashboardShell title="Business control center">
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
          <s.icon className="mb-3 h-5 w-5 text-primary" />
          <div className="text-3xl font-bold">{s.value}</div>
          <div className="text-sm text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
        <h3 className="mb-2 font-semibold">Products & services</h3>
        <p className="text-sm text-muted-foreground">List what you sell — coming next.</p>
      </div>
      <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
        <h3 className="mb-2 font-semibold">Crew sub-portal</h3>
        <p className="text-sm text-muted-foreground">Invite workers and assign tasks — coming next.</p>
      </div>
    </div>
  </DashboardShell>
);

export default BusinessDashboard;

import { DashboardShell } from "@/components/dashboard-shell";
import { Building2, ShieldCheck, Activity } from "lucide-react";

const stats = [
  { label: "Total users", value: "—", icon: ShieldCheck },
  { label: "Businesses", value: "—", icon: Building2 },
  { label: "Activity (24h)", value: "—", icon: Activity },
];

const AdminDashboard = () => (
  <DashboardShell title="Admin overview">
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
          <s.icon className="mb-3 h-5 w-5 text-primary" />
          <div className="text-3xl font-bold">{s.value}</div>
          <div className="text-sm text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
    <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
      <p className="text-muted-foreground">Approvals & moderation tools coming next.</p>
    </div>
  </DashboardShell>
);

export default AdminDashboard;

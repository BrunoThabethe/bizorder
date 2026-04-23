import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAdminMetrics, formatNumber, formatPrice } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

const StatCard = ({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
  to,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: typeof Users;
  tone?: "default" | "success" | "warning" | "destructive";
  to?: string;
}) => {
  const toneClasses = {
    default: "bg-foreground text-background",
    success: "bg-foreground/85 text-background",
    warning: "bg-foreground/15 text-foreground",
    destructive: "bg-destructive/15 text-destructive",
  } as const;
  const inner = (
    <Card className="rounded-3xl border-0 shadow-card transition-all hover:-translate-y-0.5">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className={cn("grid h-10 w-10 place-items-center rounded-xl", toneClasses[tone])}>
            <Icon className="h-5 w-5" />
          </span>
          {to && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-1 font-display text-3xl font-bold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

const AdminDashboardPage = () => {
  const { data: m, isLoading } = useQuery({ queryKey: ["admin", "metrics"], queryFn: fetchAdminMetrics });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Platform overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Key signals across users, orders, payouts, and growth.</p>
        </div>

        {isLoading || !m ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total users" value={formatNumber(m.totalUsers)} hint={`${m.customers} customers · ${m.providers} providers · ${m.crew} crew`} icon={Users} to="/admin/users" />
              <StatCard title="Active businesses" value={formatNumber(m.publishedBusinesses)} hint={`${m.totalBusinesses} total registered`} icon={Briefcase} to="/admin/businesses" />
              <StatCard title="Total GMV" value={formatPrice(m.gmv)} hint="Completed orders" icon={TrendingUp} tone="success" />
              <StatCard title="Pending payouts" value={formatPrice(m.pendingPayouts)} hint="Awaiting release" icon={Wallet} tone="warning" to="/admin/payouts" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="New orders" value={formatNumber(m.pendingOrders)} icon={Clock} to="/admin/orders" />
              <StatCard title="In progress" value={formatNumber(m.inProgressOrders + m.acceptedOrders)} icon={Activity} to="/admin/orders" />
              <StatCard title="Completed" value={formatNumber(m.completedOrders)} hint={`${m.completionRate}% completion rate`} icon={CheckCircle2} tone="success" />
              <StatCard title="Cancelled" value={formatNumber(m.cancelledOrders)} hint={`${m.cancellationRate}% cancel rate`} icon={XCircle} tone="destructive" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Open disputes" value={formatNumber(m.openDisputes)} icon={AlertTriangle} tone="destructive" to="/admin/disputes" />
              <StatCard title="Pending verifications" value={formatNumber(m.pendingVerifications)} icon={ShieldCheck} tone="warning" to="/admin/verification" />
              <StatCard title="Newsletter list" value={formatNumber(m.subscribers)} hint="Active subscribers" icon={Mail} to="/admin/newsletter" />
              <StatCard title="Total orders" value={formatNumber(m.totalOrders)} icon={Activity} to="/admin/orders" />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;

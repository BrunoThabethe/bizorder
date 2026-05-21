import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  FileEdit,
  Inbox,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAdminMetrics, fetchAdminTrends, formatNumber, formatPrice } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

const STATUS_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--foreground))",
  "hsl(var(--muted-foreground))",
  "hsl(142 71% 45%)",
  "hsl(0 72% 51%)",
];

const ROLE_COLORS = ["hsl(var(--primary))", "hsl(var(--foreground))", "hsl(var(--muted-foreground))", "hsl(142 71% 45%)"];

const Kpi = ({
  label,
  value,
  hint,
  icon: Icon,
  to,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Users;
  to?: string;
  tone?: "default" | "success" | "warning" | "destructive";
}) => {
  const toneClasses = {
    default: "bg-foreground text-background",
    success: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    warning: "bg-foreground/15 text-foreground",
    destructive: "bg-destructive/15 text-destructive",
  } as const;
  const inner = (
    <Card className="rounded-3xl border-0 shadow-card transition-all hover:-translate-y-0.5">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-bold leading-tight">{value}</p>
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

const ChartCard = ({
  title,
  subtitle,
  children,
  to,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  to?: string;
}) => {
  const inner = (
    <Card className="rounded-3xl border-0 shadow-card transition-all hover:shadow-lg">
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="h-[260px] w-full">{children}</div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { data: m, isLoading } = useQuery({ queryKey: ["admin", "metrics"], queryFn: fetchAdminMetrics });
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["admin", "trends"],
    queryFn: fetchAdminTrends,
  });

  const orderPieData = useMemo(() => {
    if (!m) return [];
    return [
      { name: "New", value: m.pendingOrders },
      { name: "In progress", value: m.inProgressOrders + m.acceptedOrders },
      { name: "Awaiting", value: 0 },
      { name: "Completed", value: m.completedOrders },
      { name: "Cancelled", value: m.cancelledOrders },
    ].filter((d) => d.value > 0);
  }, [m]);

  const roleData = useMemo(() => {
    if (!m) return [];
    return [
      { name: "Customers", value: m.customers },
      { name: "Providers", value: m.providers },
      { name: "Crew", value: m.crew },
      { name: "Admins", value: m.admins },
    ].filter((d) => d.value > 0);
  }, [m]);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Platform overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live signals across orders, growth and people. Tap any chart to dive in.
          </p>
        </div>

        {isLoading || !m ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Hero charts */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Orders pipeline pie */}
              <ChartCard
                title="Order pipeline"
                subtitle={`${formatNumber(m.totalOrders)} orders · ${m.completionRate}% completion rate`}
                to="/admin/orders"
              >
                {orderPieData.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">No orders yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                        onClick={() => navigate("/admin/orders")}
                      >
                        {orderPieData.map((_, i) => (
                          <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="-mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {orderPieData.map((d, i) => (
                    <span key={d.name} className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold">{d.value}</span>
                    </span>
                  ))}
                </div>
              </ChartCard>

              {/* GMV trend */}
              <ChartCard
                title="Revenue (last 30 days)"
                subtitle={`Total GMV ${formatPrice(m.gmv)}`}
                to="/admin/analytics"
              >
                {trendsLoading || !trends ? (
                  <div className="grid h-full place-items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        interval={4}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => formatPrice(v)}
                      />
                      <Area
                        type="monotone"
                        dataKey="gmv"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fill="url(#gmvFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Users by role donut */}
              <ChartCard
                title="People on the platform"
                subtitle={`${formatNumber(m.totalUsers)} total accounts`}
                to="/admin/users"
              >
                {roleData.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">No users yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                        onClick={() => navigate("/admin/users")}
                      >
                        {roleData.map((_, i) => (
                          <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="-mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {roleData.map((d, i) => (
                    <span key={d.name} className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: ROLE_COLORS[i % ROLE_COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold">{d.value}</span>
                    </span>
                  ))}
                </div>
              </ChartCard>
            </div>

            {/* KPI strip */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="GMV" value={formatPrice(m.gmv)} hint="Completed orders" icon={TrendingUp} tone="success" />
              <Kpi
                label="Total orders"
                value={formatNumber(m.totalOrders)}
                hint={`${m.pendingOrders} new · ${m.cancellationRate}% cancelled`}
                icon={Inbox}
                to="/admin/orders"
              />
              <Kpi
                label="Active businesses"
                value={formatNumber(m.publishedBusinesses)}
                hint={`${m.totalBusinesses} registered`}
                icon={Briefcase}
                to="/admin/businesses"
              />
              <Kpi
                label="Pending payouts"
                value={formatPrice(m.pendingPayouts)}
                hint="Awaiting release"
                icon={Wallet}
                tone="warning"
                to="/admin/payouts"
              />
              <Kpi
                label="Open disputes"
                value={formatNumber(m.openDisputes)}
                icon={AlertTriangle}
                tone={m.openDisputes > 0 ? "destructive" : "default"}
                to="/admin/disputes"
              />
              <Kpi
                label="Pending verifications"
                value={formatNumber(m.pendingVerifications)}
                icon={ShieldCheck}
                tone="warning"
                to="/admin/verification"
              />
              <Kpi
                label="Customers"
                value={formatNumber(m.customers)}
                hint="Buying on the platform"
                icon={Users}
                to="/admin/users"
              />
              <Kpi
                label="Providers"
                value={formatNumber(m.providers)}
                hint="Selling on the platform"
                icon={Briefcase}
                to="/admin/users"
              />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;

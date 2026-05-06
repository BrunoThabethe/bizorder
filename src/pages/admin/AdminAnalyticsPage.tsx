import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, ShoppingCart, Wallet, Activity, AlertOctagon, Mail } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAdminMetrics, formatNumber, formatPrice } from "@/lib/admin/queries";

const KpiCard = ({
  label,
  value,
  hint,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof TrendingUp;
  delay?: number;
}) => (
  <Card
    className="animate-fade-in rounded-3xl border-0 shadow-card"
    style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
  >
    <CardContent className="space-y-2 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="font-display text-3xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </CardContent>
  </Card>
);

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

// Use semantic-token-derived HSL colours via CSS vars
const PIPELINE_COLORS = [
  "hsl(var(--muted-foreground))",
  "hsl(var(--foreground) / 0.55)",
  "hsl(var(--foreground) / 0.75)",
  "hsl(var(--foreground))",
  "hsl(var(--destructive))",
];
const ROLE_COLORS = [
  "hsl(var(--foreground))",
  "hsl(var(--foreground) / 0.7)",
  "hsl(var(--foreground) / 0.45)",
  "hsl(var(--foreground) / 0.25)",
];

const formatDayLabel = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const AdminAnalyticsPage = () => {
  const { data: m, isLoading } = useQuery({ queryKey: ["admin", "metrics"], queryFn: fetchAdminMetrics });

  if (isLoading || !m) {
    return (
      <AdminLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const pipelineData = [
    { name: "New", value: m.pendingOrders },
    { name: "Accepted", value: m.acceptedOrders },
    { name: "In progress", value: m.inProgressOrders },
    { name: "Completed", value: m.completedOrders },
    { name: "Cancelled", value: m.cancelledOrders },
  ].filter((d) => d.value > 0);

  const rolesData = [
    { name: "Customers", value: m.customers },
    { name: "Providers", value: m.providers },
    { name: "Crew", value: m.crew },
    { name: "Admins", value: m.admins },
  ].filter((d) => d.value > 0);

  const dailySeries = m.dailyOrders.map((d) => ({ ...d, label: formatDayLabel(d.date) }));
  const aov = m.completedOrders > 0 ? m.gmv / m.completedOrders : 0;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Analytics & reporting</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How orders, providers, and revenue are trending across BizOrder.
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total GMV" value={formatPrice(m.gmv)} hint={`${formatNumber(m.completedOrders)} completed orders`} icon={Wallet} delay={0} />
          <KpiCard label="Avg order value" value={formatPrice(aov)} hint="Across completed orders" icon={TrendingUp} delay={60} />
          <KpiCard label="Completion rate" value={`${m.completionRate}%`} hint={`${m.cancellationRate}% cancelled`} icon={Activity} delay={120} />
          <KpiCard label="Active orders" value={formatNumber(m.totalOrders - m.completedOrders - m.cancelledOrders)} hint={`${formatNumber(m.totalOrders)} total`} icon={ShoppingCart} delay={180} />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="animate-fade-in rounded-3xl border-0 shadow-card" style={{ animationDelay: "240ms", animationFillMode: "both" }}>
            <CardContent className="space-y-3 p-5">
              <div>
                <h2 className="font-display text-lg font-bold">Order pipeline</h2>
                <p className="text-xs text-muted-foreground">Where every order sits right now.</p>
              </div>
              <div className="h-72 w-full">
                {pipelineData.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">No orders yet.</div>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pipelineData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {pipelineData.map((_, i) => (
                          <Cell key={i} fill={PIPELINE_COLORS[i % PIPELINE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {pipelineData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIPELINE_COLORS[i % PIPELINE_COLORS.length] }} />
                    <span className="font-semibold">{d.name}</span>
                    <span className="text-muted-foreground">{formatNumber(d.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in rounded-3xl border-0 shadow-card" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
            <CardContent className="space-y-3 p-5">
              <div>
                <h2 className="font-display text-lg font-bold">Users by role</h2>
                <p className="text-xs text-muted-foreground">Composition of the BizOrder community.</p>
              </div>
              <div className="h-72 w-full">
                {rolesData.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">No users yet.</div>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={rolesData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {rolesData.map((_, i) => (
                          <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {rolesData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLE_COLORS[i % ROLE_COLORS.length] }} />
                    <span className="font-semibold">{d.name}</span>
                    <span className="text-muted-foreground">{formatNumber(d.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in rounded-3xl border-0 shadow-card lg:col-span-2" style={{ animationDelay: "360ms", animationFillMode: "both" }}>
            <CardContent className="space-y-3 p-5">
              <div>
                <h2 className="font-display text-lg font-bold">Orders over the last 30 days</h2>
                <p className="text-xs text-muted-foreground">Daily orders created vs completed.</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer>
                  <LineChart data={dailySeries}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      interval={Math.ceil(dailySeries.length / 8)}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="created" stroke="hsl(var(--foreground))" strokeWidth={2.5} dot={false} name="Created" />
                    <Line type="monotone" dataKey="completed" stroke="hsl(var(--muted-foreground))" strokeWidth={2.5} dot={false} name="Completed" strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-6 rounded-full bg-foreground" />
                  <span className="font-semibold">Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-6 rounded-full bg-muted-foreground" />
                  <span className="font-semibold">Completed</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in rounded-3xl border-0 shadow-card" style={{ animationDelay: "420ms", animationFillMode: "both" }}>
            <CardContent className="space-y-3 p-5">
              <div>
                <h2 className="font-display text-lg font-bold">Top providers by revenue</h2>
                <p className="text-xs text-muted-foreground">Biggest contributors to GMV.</p>
              </div>
              <div className="h-72 w-full">
                {m.topProviders.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">No completed orders yet.</div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={m.topProviders} layout="vertical" margin={{ left: 12, right: 24 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatPrice(Number(v))} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPrice(Number(v))} />
                      <Bar dataKey="gmv" fill="hsl(var(--foreground))" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in rounded-3xl border-0 shadow-card" style={{ animationDelay: "480ms", animationFillMode: "both" }}>
            <CardContent className="space-y-4 p-5">
              <div>
                <h2 className="font-display text-lg font-bold">Health signals</h2>
                <p className="text-xs text-muted-foreground">Operational metrics worth keeping an eye on.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Wallet className="h-3.5 w-3.5" /> Pending payouts
                  </div>
                  <p className="mt-1 font-display text-2xl font-bold">{formatPrice(m.pendingPayouts)}</p>
                </div>
                <div className="rounded-2xl bg-muted p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <AlertOctagon className="h-3.5 w-3.5" /> Open disputes
                  </div>
                  <p className="mt-1 font-display text-2xl font-bold">{formatNumber(m.openDisputes)}</p>
                </div>
                <div className="rounded-2xl bg-muted p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> Newsletter list
                  </div>
                  <p className="mt-1 font-display text-2xl font-bold">{formatNumber(m.subscribers)}</p>
                </div>
                <div className="rounded-2xl bg-muted p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" /> Pending verifications
                  </div>
                  <p className="mt-1 font-display text-2xl font-bold">{formatNumber(m.pendingVerifications)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalyticsPage;

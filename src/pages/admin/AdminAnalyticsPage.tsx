import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAdminMetrics, formatNumber, formatPrice } from "@/lib/admin/queries";

const Bar = ({ label, value, total }: { label: string; value: number; total: number }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">
          {formatNumber(value)} <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const AdminAnalyticsPage = () => {
  const { data: m, isLoading } = useQuery({ queryKey: ["admin", "metrics"], queryFn: fetchAdminMetrics });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Analytics & reporting</h1>
          <p className="mt-1 text-sm text-muted-foreground">Performance trends across orders, providers, and growth.</p>
        </div>

        {isLoading || !m ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-3xl border-0 shadow-card">
              <CardContent className="space-y-4 p-5">
                <h2 className="font-display text-lg font-bold">Order pipeline</h2>
                <Bar label="New" value={m.pendingOrders} total={m.totalOrders} />
                <Bar label="Accepted" value={m.acceptedOrders} total={m.totalOrders} />
                <Bar label="In progress" value={m.inProgressOrders} total={m.totalOrders} />
                <Bar label="Completed" value={m.completedOrders} total={m.totalOrders} />
                <Bar label="Cancelled" value={m.cancelledOrders} total={m.totalOrders} />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-card">
              <CardContent className="space-y-4 p-5">
                <h2 className="font-display text-lg font-bold">Users by role</h2>
                <Bar label="Customers" value={m.customers} total={m.totalUsers} />
                <Bar label="Providers" value={m.providers} total={m.totalUsers} />
                <Bar label="Crew" value={m.crew} total={m.totalUsers} />
                <Bar label="Admins" value={m.admins} total={m.totalUsers} />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-card">
              <CardContent className="space-y-3 p-5">
                <h2 className="font-display text-lg font-bold">Financials</h2>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total GMV</span>
                  <span className="font-display text-xl font-bold">{formatPrice(m.gmv)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending payouts</span>
                  <span className="font-display text-xl font-bold">{formatPrice(m.pendingPayouts)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg order value</span>
                  <span className="font-display text-xl font-bold">
                    {formatPrice(m.completedOrders > 0 ? m.gmv / m.completedOrders : 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-card">
              <CardContent className="space-y-3 p-5">
                <h2 className="font-display text-lg font-bold">Health signals</h2>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completion rate</span>
                  <span className="font-display text-xl font-bold">{m.completionRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cancellation rate</span>
                  <span className="font-display text-xl font-bold">{m.cancellationRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Open disputes</span>
                  <span className="font-display text-xl font-bold">{formatNumber(m.openDisputes)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Newsletter list</span>
                  <span className="font-display text-xl font-bold">{formatNumber(m.subscribers)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAnalyticsPage;

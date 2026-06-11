import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Inbox, ShieldAlert, Star, Wallet } from "lucide-react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchMyBusiness,
  fetchBusinessOrders,
  fetchPayouts,
  formatPrice,
  STATUS_LABEL,
  STATUS_TONE,
  type Order,
} from "@/lib/business/queries";
import { cn } from "@/lib/utils";
import { useRealtimeInvalidate } from "@/lib/cache";

const BusinessDashboardPage = () => {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: business } = useQuery({
    queryKey: ["my-business", userId],
    queryFn: () => fetchMyBusiness(userId),
    enabled: !!userId,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["business-orders", business?.id],
    queryFn: () => fetchBusinessOrders(business!.id),
    enabled: !!business?.id,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["business-payouts", business?.id],
    queryFn: () => fetchPayouts(business!.id),
    enabled: !!business?.id,
  });

  useRealtimeInvalidate(
    [
      { table: "orders", filter: business?.id ? `business_id=eq.${business.id}` : undefined },
      { table: "payouts", filter: business?.id ? `business_id=eq.${business.id}` : undefined },
    ],
    [["business-orders", business?.id], ["business-payouts", business?.id]],
    { enabled: !!business?.id },
  );

  const newOrders = orders.filter((o) => (o as Order).status === "pending").length;
  const inProgress = orders.filter((o) =>
    ["accepted", "in_progress", "ready"].includes((o as Order).status),
  ).length;
  const completed = orders.filter((o) => (o as Order).status === "completed");
  const earned = completed.reduce((s, o) => s + Number((o as Order).total ?? 0), 0);
  const pendingPayout = payouts
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);

  const recent = orders.slice(0, 6);

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow="Provider portal"
        title={business ? business.name : "Welcome"}
        description="Track new orders, manage your queue, and keep customers updated."
        action={
          <Button asChild>
            <Link to="/business/orders">
              View order queue <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {business && !business.is_onboarded && (
        <Card className="mb-4 rounded-3xl border-0 bg-foreground text-background shadow-card-lift">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-display font-bold">Complete your verification</p>
                <p className="text-sm text-background/80">
                  Upload your owner ID, proof of residence, address, and proof of operations to start taking orders.
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" className="shrink-0">
              <Link to="/business/onboarding">
                Continue onboarding <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="New orders" value={String(newOrders)} icon={<Inbox className="h-4 w-4" />} />
        <KpiCard label="In progress" value={String(inProgress)} icon={<Star className="h-4 w-4" />} />
        <KpiCard label="Total earned" value={formatPrice(earned)} icon={<Wallet className="h-4 w-4" />} />
        <KpiCard label="Pending payout" value={formatPrice(pendingPayout)} icon={<Wallet className="h-4 w-4" />} />
      </div>

      <Card className="mt-5 rounded-3xl border-0 shadow-card">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Recent orders</h2>
            <Link to="/business/orders" className="text-sm font-semibold text-foreground underline-offset-4 hover:underline">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
              No orders yet. Once a customer places an order, it will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((row) => {
                const o = row as Order & { services?: { title: string } | null };
                return (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{o.services?.title ?? "Custom order"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("en-ZA")} · {formatPrice(Number(o.total), o.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_TONE[o.status])}>
                        {STATUS_LABEL[o.status]}
                      </span>
                      <Button asChild size="sm" variant="secondary">
                        <Link to={`/business/orders/${o.id}`}>Open</Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </BusinessLayout>
  );
};

const KpiCard = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <Card className="rounded-3xl border-0 shadow-card">
    <CardContent className="flex items-center justify-between p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      </div>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background">{icon}</span>
    </CardContent>
  </Card>
);

export { BusinessDashboardPage };
export default BusinessDashboardPage;

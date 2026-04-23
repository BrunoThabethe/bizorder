import { useQuery } from "@tanstack/react-query";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyBusiness, fetchPayouts, formatPrice, type Payout } from "@/lib/business/queries";
import { cn } from "@/lib/utils";

const TONE: Record<Payout["status"], string> = {
  pending: "bg-muted text-foreground",
  released: "bg-foreground/15 text-foreground",
  paid: "bg-foreground text-background",
};

const PayoutsPage = () => {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: business } = useQuery({
    queryKey: ["my-business", userId],
    queryFn: () => fetchMyBusiness(userId),
    enabled: !!userId,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["business-payouts", business?.id],
    queryFn: () => fetchPayouts(business!.id),
    enabled: !!business?.id,
  });

  const totals = payouts.reduce(
    (acc, p) => {
      acc[p.status] += Number(p.amount ?? 0);
      return acc;
    },
    { pending: 0, released: 0, paid: 0 } as Record<Payout["status"], number>,
  );

  return (
    <BusinessLayout>
      <PageHeader eyebrow="Earnings" title="Payouts" description="Money owed to you and what's been paid out." />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(["pending", "released", "paid"] as const).map((k) => (
          <Card key={k} className="rounded-3xl border-0 shadow-card">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k}</p>
              <p className="mt-1 font-display text-2xl font-bold">{formatPrice(totals[k])}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-5 rounded-3xl border-0 shadow-card">
        <CardContent className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Recent payouts</h2>
          {payouts.length === 0 ? (
            <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
              Payouts will appear here once orders are completed and released.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold">{formatPrice(Number(p.amount), p.currency)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-ZA")}</p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", TONE[p.status])}>{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </BusinessLayout>
  );
};

export { PayoutsPage };
export default PayoutsPage;

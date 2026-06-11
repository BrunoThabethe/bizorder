import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchBusinessOrders,
  fetchMyBusiness,
  formatPrice,
  STATUS_LABEL,
  STATUS_TONE,
  type Order,
  type OrderStatus,
} from "@/lib/business/queries";
import { cn } from "@/lib/utils";

const FILTERS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "New" },
  { key: "accepted", label: "Accepted" },
  { key: "in_progress", label: "In progress" },
  { key: "ready", label: "Ready" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "ready_for_review", label: "Awaiting approval" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const OrdersQueuePage = () => {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

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

  const filtered = useMemo(() => {
    return orders.filter((row) => {
      const o = row as Order & { services?: { title: string } | null; profiles?: { full_name: string | null } | null };
      const matchesStatus = filter === "all" || o.status === filter;
      const haystack = `${o.services?.title ?? ""} ${o.profiles?.full_name ?? ""} ${o.id}`.toLowerCase();
      const matchesQuery = !q || haystack.includes(q.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [orders, filter, q]);

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow="Order queue"
        title="Incoming orders"
        description="Accept new orders fast — set an ETA and keep the customer in the loop."
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search by service, customer, or order id"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="md:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f.key
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No orders match this view yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((row) => {
            const o = row as Order & {
              services?: { title: string } | null;
              profiles?: { full_name: string | null; email: string } | null;
            };
            return (
              <Card key={o.id} className="rounded-3xl border-0 shadow-card">
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_TONE[o.status])}>
                        {STATUS_LABEL[o.status]}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">#{o.id.slice(0, 8)}</span>
                    </div>
                    <p className="mt-2 truncate font-semibold">{o.services?.title ?? "Custom order"}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.profiles?.full_name ?? o.profiles?.email ?? "Customer"} ·{" "}
                      {new Date(o.created_at).toLocaleString("en-ZA")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <p className="font-display text-lg font-bold">{formatPrice(Number(o.total), o.currency)}</p>
                    <Button asChild>
                      <Link to={`/business/orders/${o.id}`}>Open</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </BusinessLayout>
  );
};

export { OrdersQueuePage };
export default OrdersQueuePage;

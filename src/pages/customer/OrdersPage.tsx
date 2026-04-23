import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Compass, Package } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyOrders, formatPrice, STATUS_LABEL, STATUS_TONE, type OrderStatus } from "@/lib/customer/queries";
import { cn } from "@/lib/utils";

type Tab = "active" | "completed" | "all";

const tabs: { id: Tab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All" },
];

const OrdersPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("active");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["customer-orders", user?.id],
    queryFn: () => fetchMyOrders(user?.id as string),
    enabled: !!user?.id,
  });

  const filtered = useMemo(() => {
    if (tab === "active") return orders.filter((o) => !["completed", "cancelled"].includes(o.status));
    if (tab === "completed") return orders.filter((o) => ["completed", "cancelled"].includes(o.status));
    return orders;
  }, [orders, tab]);

  return (
    <CustomerLayout>
      <PageHeader
        eyebrow="History"
        title="Your orders"
        description="Live status, past purchases, and quick links to provider chats."
        action={
          <Button asChild>
            <Link to="/customer/browse">
              <Compass className="h-4 w-4" /> Browse
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex gap-2 rounded-3xl bg-card p-1 shadow-card">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
              tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-card shadow-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-3xl bg-card p-10 text-center shadow-card">
          <Package className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-bold">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">When you place orders they'll appear in this list.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((order) => (
            <li key={order.id}>
              <Link
                to={`/customer/orders/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-foreground text-xs font-bold text-background">
                    {(order.businesses?.name ?? "??").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold">{order.businesses?.name ?? "Provider"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {order.services?.title ?? "Custom"} · {new Date(order.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-display text-sm font-bold">{formatPrice(Number(order.total), order.currency)}</span>
                  <span className={cn("rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider", STATUS_TONE[order.status as OrderStatus])}>
                    {STATUS_LABEL[order.status as OrderStatus]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CustomerLayout>
  );
};

export { OrdersPage };
export default OrdersPage;

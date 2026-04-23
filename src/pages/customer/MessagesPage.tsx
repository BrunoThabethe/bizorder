import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyOrders, STATUS_LABEL, STATUS_TONE, type OrderStatus } from "@/lib/customer/queries";
import { cn } from "@/lib/utils";

const MessagesPage = () => {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["customer-orders", user?.id],
    queryFn: () => fetchMyOrders(user?.id as string),
    enabled: !!user?.id,
  });

  const active = orders.filter((o) => !["cancelled"].includes(o.status));

  return (
    <CustomerLayout>
      <PageHeader
        eyebrow="Inbox"
        title="Messages & updates"
        description="Open any order to chat with the provider and read their updates."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-card shadow-card" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="grid place-items-center rounded-3xl bg-card p-10 text-center shadow-card">
          <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-bold">No conversations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Place an order to start chatting with a provider.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {active.map((order) => (
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
                      Order #{order.id.slice(0, 8)} · {order.services?.title ?? "Custom"}
                    </p>
                  </div>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider", STATUS_TONE[order.status as OrderStatus])}>
                  {STATUS_LABEL[order.status as OrderStatus]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CustomerLayout>
  );
};

export { MessagesPage };
export default MessagesPage;

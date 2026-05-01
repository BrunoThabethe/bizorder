import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Check, Compass, MapPin, Package, Sparkles, Star, Wallet } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusStepper } from "@/components/orders/OrderStatusStepper";
import {
  fetchMyAddresses,
  fetchMyOrders,
  fetchMyNotifications,
  fetchPublishedBusinesses,
  formatPrice,
  STATUS_LABEL,
  STATUS_TONE,
  type OrderStatus,
} from "@/lib/customer/queries";
import { cn } from "@/lib/utils";

const statCard = "rounded-3xl bg-card p-5 shadow-card";

const CustomerDashboardPage = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const { data: orders = [] } = useQuery({
    queryKey: ["customer-orders", userId],
    queryFn: () => fetchMyOrders(userId as string),
    enabled: !!userId,
  });
  const { data: notifications = [] } = useQuery({
    queryKey: ["customer-notifications", userId],
    queryFn: () => fetchMyNotifications(userId as string),
    enabled: !!userId,
  });
  const { data: businesses = [] } = useQuery({
    queryKey: ["browse-businesses"],
    queryFn: fetchPublishedBusinesses,
  });
  const { data: addresses = [] } = useQuery({
    queryKey: ["my-addresses", userId],
    queryFn: () => fetchMyAddresses(userId as string),
    enabled: !!userId,
  });

  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const currentOrder = activeOrders[0];
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const unreadAlerts = notifications.filter((n) => !n.read_at).length;
  const firstName = ((user?.user_metadata?.full_name as string | undefined) ?? "there").split(" ")[0];

  const hasAddress = addresses.length > 0;
  const hasFirstOrder = orders.length > 0;
  const onboardingDone = hasAddress && hasFirstOrder;

  return (
    <CustomerLayout>
      <PageHeader
        eyebrow={greeting}
        title={`Hi ${firstName} 👋`}
        description="Your orders, providers and updates — all in one place."
        action={
          <Button asChild size="lg">
            <Link to="/customer/browse">
              <Compass className="h-4 w-4" /> Start an order
            </Link>
          </Button>
        }
      />

      {/* Onboarding checklist — only shows until both items done */}
      {!onboardingDone && (
        <section className="mb-4 rounded-3xl bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Get set up in 2 steps</h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {[hasAddress, hasFirstOrder].filter(Boolean).length}/2 done
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <ChecklistItem
              done={hasAddress}
              icon={MapPin}
              title="Add a delivery address"
              text="So providers know where to go."
              cta={{ to: "/customer/addresses", label: hasAddress ? "Manage" : "Add address" }}
            />
            <ChecklistItem
              done={hasFirstOrder}
              icon={Package}
              title="Place your first order"
              text="Browse trusted providers near you."
              cta={{ to: "/customer/browse", label: hasFirstOrder ? "Browse more" : "Browse providers" }}
            />
          </div>
        </section>
      )}

      {/* Active order tracker */}
      {currentOrder && (
        <section className="mb-4 rounded-3xl bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Active order
              </p>
              <p className="mt-1 truncate font-display text-lg font-bold">
                {currentOrder.businesses?.name ?? "Provider"} ·{" "}
                <span className="text-muted-foreground">{currentOrder.services?.title ?? "Order"}</span>
              </p>
            </div>
            <Button asChild size="sm">
              <Link to={`/customer/orders/${currentOrder.id}`}>
                Open <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="mt-4">
            <OrderStatusStepper status={currentOrder.status as OrderStatus} />
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className={statCard}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active orders</span>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{activeOrders.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across all providers</p>
        </div>
        <div className={statCard}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total spent</span>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{formatPrice(totalSpent)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Lifetime on BizOrder</p>
        </div>
        <div className={statCard}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New alerts</span>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{unreadAlerts}</p>
          <p className="mt-1 text-xs text-muted-foreground">Unread notifications</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Recent orders</h2>
            <Link to="/customer/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {orders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No orders yet"
              text="Browse businesses and place your first order."
              cta={{ to: "/customer/browse", label: "Browse" }}
            />
          ) : (
            <ul className="mt-4 space-y-2">
              {orders.slice(0, 5).map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/customer/orders/${order.id}`}
                    className="flex items-center justify-between rounded-2xl bg-muted/50 p-3 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold">
                        {order.businesses?.name ?? "Business"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.services?.title ?? "Custom order"} · {formatPrice(Number(order.total ?? 0), order.currency)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                        STATUS_TONE[order.status as OrderStatus],
                      )}
                    >
                      {STATUS_LABEL[order.status as OrderStatus]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Discover</h2>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </div>
          {businesses.length === 0 ? (
            <EmptyState icon={Compass} title="No businesses live yet" text="Check back soon for new providers." />
          ) : (
            <ul className="mt-4 space-y-2">
              {businesses.slice(0, 4).map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/customer/business/${b.slug}`}
                    className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3 transition-colors hover:bg-muted"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-foreground text-xs font-bold text-background">
                      {b.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold">{b.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{b.tagline ?? b.category ?? "Local provider"}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold">
                      <Star className="h-3 w-3 fill-current" /> {Number(b.rating_avg).toFixed(1)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </CustomerLayout>
  );
};

const EmptyState = ({
  icon: Icon,
  title,
  text,
  cta,
}: {
  icon: typeof Package;
  title: string;
  text: string;
  cta?: { to: string; label: string };
}) => (
  <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-muted/40 p-6 text-center">
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/10">
      <Icon className="h-5 w-5 text-foreground" />
    </div>
    <div>
      <p className="font-display text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </div>
    {cta ? (
      <Button asChild size="sm">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    ) : null}
  </div>
);

export { CustomerDashboardPage };
export default CustomerDashboardPage;

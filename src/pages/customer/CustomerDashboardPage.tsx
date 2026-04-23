import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Compass, Package, Sparkles, Star, Wallet } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
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

  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const unreadAlerts = notifications.filter((n) => !n.read_at).length;
  const firstName = ((user?.user_metadata?.full_name as string | undefined) ?? "there").split(" ")[0];

  return (
    <CustomerLayout>
      <PageHeader
        eyebrow={greeting}
        title={`Hi ${firstName} 👋`}
        description="Track your orders, message providers, and discover new businesses around you."
        action={
          <Button asChild size="lg">
            <Link to="/customer/browse">
              <Compass className="h-4 w-4" /> Browse businesses
            </Link>
          </Button>
        }
      />

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

import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Clock, MapPin, Phone, Star } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchBusinessBySlug, fetchBusinessServices, formatPrice } from "@/lib/customer/queries";
import {
  AVAILABILITY_LABEL,
  AVAILABILITY_TONE,
  DAY_LABELS,
  fetchBusinessHours,
  fetchBusinessSettings,
  type Availability,
} from "@/lib/business/queries";
import { cn } from "@/lib/utils";

const formatTime = (t: string) => t.slice(0, 5);

const BusinessProfilePage = () => {
  const { slug = "" } = useParams();

  const { data: business, isLoading } = useQuery({
    queryKey: ["business", slug],
    queryFn: () => fetchBusinessBySlug(slug),
    enabled: !!slug,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["business-services", business?.id],
    queryFn: () => fetchBusinessServices(business?.id as string),
    enabled: !!business?.id,
  });

  const { data: settings } = useQuery({
    queryKey: ["business-settings", business?.id],
    queryFn: () => fetchBusinessSettings(business!.id),
    enabled: !!business?.id,
  });

  const { data: hours = [] } = useQuery({
    queryKey: ["business-hours", business?.id],
    queryFn: () => fetchBusinessHours(business!.id),
    enabled: !!business?.id,
  });

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="h-64 animate-pulse rounded-3xl bg-card shadow-card" />
      </CustomerLayout>
    );
  }

  if (!business) {
    return (
      <CustomerLayout>
        <div className="grid place-items-center rounded-3xl bg-card p-10 text-center shadow-card">
          <p className="font-display text-lg font-bold">Business not found</p>
          <Button asChild className="mt-4" variant="secondary">
            <Link to="/customer/browse">
              <ArrowLeft className="h-4 w-4" /> Back to browse
            </Link>
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const availability = (settings?.availability ?? "available") as Availability;
  const hoursByDay = DAY_LABELS.map((label, dow) => ({
    label,
    ranges: hours.filter((h) => h.day_of_week === dow && h.is_open),
  }));

  return (
    <CustomerLayout>
      <Link
        to="/customer/browse"
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to browse
      </Link>

      <header className="overflow-hidden rounded-3xl bg-card shadow-card">
        <div
          className="h-32 bg-gradient-to-br from-foreground/30 to-muted bg-cover bg-center md:h-44"
          style={settings?.cover_url ? { backgroundImage: `url(${settings.cover_url})` } : undefined}
        />
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="-mt-12 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-foreground text-lg font-bold text-background ring-4 ring-card">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="h-full w-full object-cover" />
              ) : (
                business.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-2xl font-bold md:text-3xl">{business.name}</h1>
                {business.is_verified ? <BadgeCheck className="h-5 w-5 text-foreground" /> : null}
                <Badge className={cn("font-semibold", AVAILABILITY_TONE[availability])}>
                  {AVAILABILITY_LABEL[availability]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{business.tagline ?? business.category}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Star className="h-3 w-3 fill-current" /> {Number(business.rating_avg).toFixed(1)} ({business.rating_count})
                </span>
                {business.city ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {business.city}
                  </span>
                ) : null}
                {business.phone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {business.phone}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      {business.description ? (
        <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">About</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{business.description}</p>
        </section>
      ) : null}

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <Clock className="h-4 w-4" /> Opening hours
        </h2>
        <ul className="mt-3 divide-y divide-border">
          {hoursByDay.map((d) => (
            <li key={d.label} className="flex items-center justify-between py-2 text-sm">
              <span className="font-semibold">{d.label}</span>
              <span className="text-muted-foreground">
                {d.ranges.length === 0
                  ? "Closed"
                  : d.ranges.map((r) => `${formatTime(r.opens_at)}–${formatTime(r.closes_at)}`).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
        <h2 className="font-display text-base font-bold">Services & products</h2>
        {services.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            This provider hasn't listed services yet. Check back soon.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {services.map((s) => {
              const itemKind = ((s as unknown as { kind?: string }).kind ?? "service");
              return (
                <li key={s.id} className="flex flex-col overflow-hidden rounded-2xl bg-muted/50">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.title} className="h-40 w-full object-cover" />
                  ) : null}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                          {itemKind === "product" ? "Product" : "Service"}
                        </span>
                        <p className="mt-1 truncate font-display text-sm font-bold">{s.title}</p>
                        {s.duration_minutes ? (
                          <p className="text-xs text-muted-foreground">{s.duration_minutes} min</p>
                        ) : null}
                      </div>
                      <span className="font-display text-base font-bold">{formatPrice(Number(s.price), s.currency)}</span>
                    </div>
                    {s.description ? (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                    ) : null}
                    <Button asChild size="sm" className="mt-3 self-start">
                      <Link to={`/customer/order/new?business=${business.id}&service=${s.id}`}>Order this</Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </CustomerLayout>
  );
};

export { BusinessProfilePage };
export default BusinessProfilePage;

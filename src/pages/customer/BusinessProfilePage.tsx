import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, MapPin, Phone, Star } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Button } from "@/components/ui/button";
import { fetchBusinessBySlug, fetchBusinessServices, formatPrice } from "@/lib/customer/queries";

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

  return (
    <CustomerLayout>
      <Link
        to="/customer/browse"
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to browse
      </Link>

      <header className="overflow-hidden rounded-3xl bg-card shadow-card">
        <div className="h-32 bg-gradient-to-br from-foreground/30 to-muted md:h-44" />
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="-mt-12 grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-foreground text-lg font-bold text-background ring-4 ring-card">
              {business.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate font-display text-2xl font-bold md:text-3xl">{business.name}</h1>
                {business.is_verified ? <BadgeCheck className="h-5 w-5 text-foreground" /> : null}
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
        <h2 className="font-display text-base font-bold">Services</h2>
        {services.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            This provider hasn't listed services yet. Check back soon.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {services.map((s) => (
              <li key={s.id} className="flex flex-col rounded-2xl bg-muted/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold">{s.title}</p>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </CustomerLayout>
  );
};

export { BusinessProfilePage };
export default BusinessProfilePage;

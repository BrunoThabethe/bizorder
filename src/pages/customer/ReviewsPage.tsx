import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyReviews } from "@/lib/customer/queries";
import { cn } from "@/lib/utils";

const ReviewsPage = () => {
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["my-reviews", user?.id],
    queryFn: () => fetchMyReviews(user?.id as string),
    enabled: !!user?.id,
  });

  return (
    <CustomerLayout>
      <PageHeader
        eyebrow="Feedback"
        title="Reviews you've left"
        description="Help others choose great providers — your reviews matter."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-card shadow-card" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="grid place-items-center rounded-3xl bg-card p-10 text-center shadow-card">
          <Star className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-bold">No reviews yet</p>
          <p className="mt-1 text-sm text-muted-foreground">After an order is completed, you can rate the provider.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {reviews.map((r) => (
            <li key={r.id}>
              <Link
                to={r.businesses?.slug ? `/customer/business/${r.businesses.slug}` : "#"}
                className="block rounded-2xl bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold">{r.businesses?.name ?? "Business"}</p>
                    <div className="mt-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn("h-4 w-4", n <= r.rating ? "fill-current text-foreground" : "text-muted-foreground/40")} />
                      ))}
                    </div>
                    {r.comment ? <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p> : null}
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-GB")}
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

export { ReviewsPage };
export default ReviewsPage;

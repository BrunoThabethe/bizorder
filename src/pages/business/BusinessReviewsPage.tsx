import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { fetchBusinessReviews, fetchMyBusiness } from "@/lib/business/queries";

const BusinessReviewsPage = () => {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: business } = useQuery({
    queryKey: ["my-business", userId],
    queryFn: () => fetchMyBusiness(userId),
    enabled: !!userId,
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ["business-reviews", business?.id],
    queryFn: () => fetchBusinessReviews(business!.id),
    enabled: !!business?.id,
  });

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow="Reputation"
        title="Reviews & ratings"
        description={
          business ? `${business.rating_avg.toFixed(1)} average from ${business.rating_count} reviews` : "Customer feedback"
        }
      />

      {reviews.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">No reviews yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {reviews.map((row) => {
            const r = row as {
              id: string;
              rating: number;
              comment: string | null;
              created_at: string;
              profiles?: { full_name: string | null } | null;
            };
            return (
              <Card key={r.id} className="rounded-3xl border-0 shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{r.profiles?.full_name ?? "Customer"}</p>
                    <div className="flex items-center gap-1 text-sm font-bold">
                      <Star className="h-4 w-4 fill-foreground text-foreground" /> {r.rating}/5
                    </div>
                  </div>
                  {r.comment ? <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p> : null}
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-ZA")}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </BusinessLayout>
  );
};

export { BusinessReviewsPage };
export default BusinessReviewsPage;

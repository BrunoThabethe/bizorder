import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { fetchCustomerQuotes } from "@/lib/business/quotes-adjustments";
import { formatPrice } from "@/lib/business/queries";
import { startPaystackCheckout } from "@/lib/payments/paystack";

const CustomerQuotesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paying, setPaying] = useState<string | null>(null);

  const { data: quotes = [] } = useQuery({
    queryKey: ["customer-quotes", user?.id],
    queryFn: () => fetchCustomerQuotes(user!.id),
    enabled: !!user?.id,
  });

  const handlePay = async (id: string) => {
    setPaying(id);
    try {
      await startPaystackCheckout({ transaction_type: "quote_payment", quote_id: id });
    } catch (e) {
      toast({ title: "Payment failed", description: (e as Error).message, variant: "destructive" });
      setPaying(null);
    }
  };

  return (
    <CustomerLayout>
      <PageHeader eyebrow="Quotes" title="My quotes" description="Pay quotes from businesses to confirm your order." />
      {quotes.length === 0 ? (
        <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
          You haven't requested any quotes yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {quotes.map((q) => (
            <li key={q.id} className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">{q.services?.title ?? "Service"}</h3>
                  <p className="text-sm text-muted-foreground">{q.businesses?.name}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase">
                  {q.status}
                </span>
              </div>
              {q.quoted_price ? (
                <p className="mt-2 text-2xl font-bold">{formatPrice(Number(q.quoted_price))}</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Awaiting business response.</p>
              )}
              {q.status === "quoted" ? (
                <Button className="mt-3 w-full" onClick={() => handlePay(q.id)} disabled={paying === q.id}>
                  {paying === q.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Pay now
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </CustomerLayout>
  );
};

export default CustomerQuotesPage;

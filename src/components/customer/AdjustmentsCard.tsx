import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchOrderAdjustments } from "@/lib/business/quotes-adjustments";
import { formatPrice } from "@/lib/business/queries";
import { startPaystackCheckout } from "@/lib/payments/paystack";

type Props = { orderId: string };

export const AdjustmentsCard = ({ orderId }: Props) => {
  const { toast } = useToast();
  const [paying, setPaying] = useState<string | null>(null);

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ["order-adjustments", orderId],
    queryFn: () => fetchOrderAdjustments(orderId),
    enabled: !!orderId,
  });

  const handlePay = async (id: string) => {
    setPaying(id);
    try {
      await startPaystackCheckout({ transaction_type: "adjustment", adjustment_id: id });
    } catch (e) {
      toast({ title: "Payment failed", description: (e as Error).message, variant: "destructive" });
      setPaying(null);
    }
  };

  if (isLoading || adjustments.length === 0) return null;

  return (
    <div className="space-y-3 rounded-3xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-bold">Adjustment requests</h3>
      <ul className="space-y-2">
        {adjustments.map((a) => (
          <li key={a.id} className="rounded-2xl bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{formatPrice(Number(a.amount))}</p>
                <p className="text-sm text-muted-foreground">{a.reason}</p>
              </div>
              <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium uppercase">
                {a.status}
              </span>
            </div>
            {a.status === "pending" ? (
              <Button
                className="mt-3 w-full"
                onClick={() => handlePay(a.id)}
                disabled={paying === a.id}
              >
                {paying === a.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Pay adjustment
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};

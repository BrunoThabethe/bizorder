import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, ArrowRight, LayoutDashboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PaymentCallbackPageProps {
  variant: "success" | "error";
}

/**
 * Public landing pages TradeSafe redirects the buyer to after checkout.
 * - /payment/success → confirms payment and shows order status
 * - /payment/error   → shows a friendly retry message.
 */
const PaymentCallbackPage = ({ variant }: PaymentCallbackPageProps) => {
  const [params] = useSearchParams();
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const orderId = params.get("order_id") ?? params.get("orderId") ?? params.get("reference");
  const isSuccess = variant === "success";

  useEffect(() => {
    if (!isSuccess || !orderId) return;

    const fetchStatus = async () => {
      setStatusLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("status")
        .eq("tradesafe_transaction_id", orderId)
        .maybeSingle();

      if (data?.status) {
        setOrderStatus(data.status);
      }
      setStatusLoading(false);
    };

    fetchStatus();
  }, [isSuccess, orderId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-card">
        {isSuccess ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
              Payment received!
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Your order is being processed.
            </p>

            {orderId && (
              <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
                {statusLoading ? (
                  <span className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking order status...
                  </span>
                ) : orderStatus ? (
                  <span className="text-foreground">
                    Order status: <strong className="capitalize">{orderStatus.replace(/_/g, " ")}</strong>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    We&apos;ll update your order as soon as TradeSafe confirms the funds.
                  </span>
                )}
              </div>
            )}
              <div className="mt-6 flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link to="/customer/orders">
                  View my orders <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/customer">
                  <LayoutDashboard className="mr-1.5 h-4 w-4" /> Back to dashboard
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
              Payment was not completed
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Please try again.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link to="/customer/orders">
                  Retry my order <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/customer">
                  <LayoutDashboard className="mr-1.5 h-4 w-4" /> Back to dashboard
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default PaymentCallbackPage;

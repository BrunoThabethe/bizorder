import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentCallbackPageProps {
  variant: "success" | "error";
}

/**
 * Public landing pages TradeSafe redirects the buyer to after checkout.
 * - /payment/success → forwards to the order's payment-return polling page
 *   (which then forwards to the order detail once the webhook confirms funds).
 * - /payment/error   → shows a friendly retry message.
 *
 * TradeSafe appends transaction/reference query params; we also accept an
 * explicit `order_id` if we passed it through the return URL.
 */
const PaymentCallbackPage = ({ variant }: PaymentCallbackPageProps) => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get("order_id") ?? params.get("orderId") ?? params.get("reference");

  useEffect(() => {
    if (variant === "success" && orderId && /^[0-9a-f-]{8,}$/i.test(orderId)) {
      const t = setTimeout(() => navigate(`/customer/orders/${orderId}/payment-return`, { replace: true }), 800);
      return () => clearTimeout(t);
    }
  }, [variant, orderId, navigate]);

  const isSuccess = variant === "success";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-card">
        {isSuccess ? (
          orderId ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <h1 className="mt-4 font-display text-xl font-bold">Thanks — confirming your payment</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Taking you to your order while TradeSafe confirms the funds.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-4 font-display text-xl font-bold">Payment received</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your provider will be notified once TradeSafe confirms the funds. You can track progress from your
                orders list.
              </p>
              <Button asChild className="mt-5">
                <Link to="/customer/orders">
                  View my orders <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </>
          )
        ) : (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 font-display text-xl font-bold">Payment didn&rsquo;t go through</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No money was taken. You can retry the payment from your orders list at any time.
            </p>
            <Button asChild className="mt-5">
              <Link to="/customer/orders">
                Back to my orders <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
};

export default PaymentCallbackPage;

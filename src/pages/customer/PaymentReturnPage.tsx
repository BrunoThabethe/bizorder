import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { startTradeSafeCheckout } from "@/lib/customer/queries";
import { useToast } from "@/hooks/use-toast";

type PaymentStatus = "pending" | "funded" | "released" | "refunded" | "failed" | "expired";

const PaymentReturnPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [tries, setTries] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    const poll = async () => {
      const { data } = await supabase
        .from("order_payments")
        .select("status")
        .eq("order_id", orderId)
        .maybeSingle();
      if (cancelled) return;
      const s = (data?.status ?? "pending") as PaymentStatus;
      setStatus(s);
      if (s === "funded" || s === "released") {
        setTimeout(() => navigate(`/customer/orders/${orderId}`), 1200);
      }
    };

    poll();
    const interval = setInterval(() => {
      setTries((t) => t + 1);
      poll();
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, navigate]);

  const isWaiting = !status || status === "pending";
  const isPaid = status === "funded" || status === "released";
  const isFailed = status === "failed" || status === "expired" || status === "refunded";

  const handleRetry = async () => {
    if (!orderId) return;
    setRetrying(true);
    try {
      const checkoutUrl = await startTradeSafeCheckout(orderId);
      window.location.assign(checkoutUrl);
    } catch (error) {
      setRetrying(false);
      toast({
        title: "Couldn't start a new payment",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  return (
    <CustomerLayout>
      <PageHeader title="Finishing up your payment" description="Hang on a moment while TradeSafe confirms." />
      <div className="mx-auto mt-8 max-w-md rounded-3xl bg-card p-8 text-center shadow-card">
        {isWaiting ? (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 font-display text-lg font-bold">Confirming payment…</p>
            <p className="mt-2 text-sm text-muted-foreground">
              We&rsquo;re waiting for TradeSafe to confirm your payment. This usually takes under a minute.
            </p>
            {tries > 12 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Still waiting? You can safely close this page — we&rsquo;ll email you when it&rsquo;s confirmed.
              </p>
            ) : null}
          </>
        ) : null}

        {isPaid ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-4 font-display text-lg font-bold">Payment confirmed</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your order is now visible to the provider. Taking you there…
            </p>
          </>
        ) : null}

        {isFailed ? (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <p className="mt-4 font-display text-lg font-bold">Payment didn&rsquo;t go through</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No money was taken and your order hasn&rsquo;t been sent to the provider yet. You can try paying again.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={handleRetry} disabled={retrying}>
                {retrying ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
                Try payment again
              </Button>
              <Button asChild variant="secondary">
                <Link to="/customer/orders">
                  Back to my orders <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </CustomerLayout>
  );
};

export default PaymentReturnPage;

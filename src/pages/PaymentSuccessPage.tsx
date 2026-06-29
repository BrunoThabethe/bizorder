import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyPaystackReference } from "@/lib/payments/paystack";

const PaymentSuccessPage = () => {
  const [params] = useSearchParams();
  const reference = params.get("reference") ?? params.get("trxref");
  const [status, setStatus] = useState<"verifying" | "ok" | "failed">("verifying");
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!reference) {
      setStatus("failed");
      return;
    }
    (async () => {
      try {
        const data = await verifyPaystackReference(reference);
        if (cancelled) return;
        setMeta((data.metadata as Record<string, unknown>) ?? null);
        setStatus(data.status === "success" ? "ok" : "failed");
      } catch {
        if (!cancelled) setStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const orderId = (meta?.order_id as string | undefined) ?? undefined;
  const txType = (meta?.transaction_type as string | undefined) ?? undefined;

  const followUpHref =
    txType === "quote_payment"
      ? "/customer/quotes"
      : orderId
        ? `/customer/orders/${orderId}`
        : "/customer/orders";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      {status === "verifying" ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Confirming your payment…</p>
        </>
      ) : status === "ok" ? (
        <>
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 font-display text-2xl font-bold">Payment confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks! Your payment was received and your order is being processed.
          </p>
          <Button asChild className="mt-6">
            <Link to={followUpHref}>View order</Link>
          </Button>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold">We couldn't verify the payment</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            If you were charged, the order will update within a minute.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/customer/orders">Go to orders</Link>
          </Button>
        </>
      )}
    </main>
  );
};

export default PaymentSuccessPage;

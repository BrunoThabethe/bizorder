// Client-side helper to call the paystack-init edge function and redirect.
import { supabase } from "@/integrations/supabase/client";

type InitArgs = {
  transaction_type: "booking" | "quote_payment" | "adjustment";
  order_id?: string;
  quote_id?: string;
  adjustment_id?: string;
  tier_id?: string | null;
};

export async function startPaystackCheckout(args: InitArgs) {
  const { data, error } = await supabase.functions.invoke("paystack-init", {
    body: { ...args, origin: window.location.origin },
  });
  if (error) throw new Error(error.message);
  const payload = data as { authorization_url?: string; error?: string };
  if (!payload?.authorization_url) {
    throw new Error(payload?.error ?? "Could not start checkout");
  }
  window.location.href = payload.authorization_url;
}

export async function verifyPaystackReference(reference: string) {
  const { data, error } = await supabase.functions.invoke("paystack-verify", {
    body: { reference },
  });
  if (error) throw new Error(error.message);
  return data as {
    status: string;
    reference: string;
    amount: number;
    metadata: Record<string, unknown> | null;
  };
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  createOrderAdjustment,
  fetchOrderAdjustments,
} from "@/lib/business/quotes-adjustments";
import { formatPrice } from "@/lib/business/queries";

type Props = {
  orderId: string;
  businessId: string;
  customerId: string;
};

export const AdjustmentForm = ({ orderId, businessId, customerId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");

  const { data: adjustments = [] } = useQuery({
    queryKey: ["order-adjustments", orderId],
    queryFn: () => fetchOrderAdjustments(orderId),
    enabled: !!orderId,
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const amt = Number(amount);
      if (!reason.trim() || reason.trim().length < 3) throw new Error("Reason is too short");
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Amount must be greater than 0");
      await createOrderAdjustment({
        order_id: orderId,
        business_id: businessId,
        customer_id: customerId,
        reason: reason.trim(),
        amount: amt,
      });
    },
    onSuccess: () => {
      setReason("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["order-adjustments", orderId] });
      toast({ title: "Adjustment sent", description: "The customer can now pay this top-up." });
    },
    onError: (e: Error) => toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
      <div>
        <h3 className="font-display text-lg font-bold">Send adjustment request</h3>
        <p className="text-sm text-muted-foreground">
          Ask the customer to pay a top-up on this order. They'll get a Paystack payment link.
        </p>
      </div>
      <Textarea
        placeholder="Reason (what is the top-up for?)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={1000}
      />
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="Amount (ZAR)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button onClick={() => send.mutate()} disabled={send.isPending}>
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="ml-2">Send</span>
        </Button>
      </div>

      {adjustments.length > 0 ? (
        <div className="space-y-2 pt-2">
          <h4 className="text-sm font-semibold">Past adjustments</h4>
          <ul className="space-y-2 text-sm">
            {adjustments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{formatPrice(Number(a.amount))}</p>
                  <p className="text-xs text-muted-foreground">{a.reason}</p>
                </div>
                <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium uppercase">
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

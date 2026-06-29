import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  fetchBusinessQuotes,
  sendQuotePrice,
} from "@/lib/business/quotes-adjustments";
import { fetchMyBusiness, formatPrice } from "@/lib/business/queries";

const BusinessQuotesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const { data: business } = useQuery({
    queryKey: ["my-business", userId],
    queryFn: () => fetchMyBusiness(userId),
    enabled: !!userId,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["business-quotes", business?.id],
    queryFn: () => fetchBusinessQuotes(business!.id),
    enabled: !!business?.id,
  });

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const grouped = useMemo(() => {
    return {
      pending: quotes.filter((q) => q.status === "pending"),
      quoted: quotes.filter((q) => q.status === "quoted"),
      done: quotes.filter((q) => q.status === "paid" || q.status === "cancelled" || q.status === "expired"),
    };
  }, [quotes]);

  const send = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => sendQuotePrice(id, price),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-quotes", business?.id] });
      toast({ title: "Quote sent" });
    },
    onError: (e: Error) => toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  return (
    <BusinessLayout>
      <PageHeader eyebrow="Quotes" title="Quote requests" description="Reply with a price and the customer pays via Paystack." />

      <Section title={`Pending (${grouped.pending.length})`}>
        {grouped.pending.length === 0 ? (
          <Empty text="No new quote requests." />
        ) : (
          grouped.pending.map((q) => {
            const draft = drafts[q.id] ?? "";
            return (
              <div key={q.id} className="space-y-3 rounded-3xl border border-border bg-card p-5">
                <header className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold">{q.services?.title ?? "Service"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {q.profile?.full_name ?? q.profile?.email ?? "Customer"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(q.created_at).toLocaleString()}
                  </span>
                </header>

                <ul className="space-y-2 rounded-2xl bg-muted/40 p-3 text-sm">
                  {(Array.isArray(q.answers) ? q.answers : []).map((a, i) => (
                    <li key={i}>
                      <p className="font-medium">{a.question}</p>
                      <p className="text-muted-foreground">{a.answer || "—"}</p>
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Price (ZAR)"
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                  />
                  <Button
                    onClick={() => {
                      const price = Number(draft);
                      if (!Number.isFinite(price) || price <= 0) {
                        toast({ title: "Enter a price", variant: "destructive" });
                        return;
                      }
                      send.mutate({ id: q.id, price });
                    }}
                    disabled={send.isPending}
                  >
                    {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send quote"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </Section>

      <Section title={`Sent (${grouped.quoted.length})`}>
        {grouped.quoted.length === 0 ? (
          <Empty text="No quotes awaiting payment." />
        ) : (
          grouped.quoted.map((q) => (
            <div key={q.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <p className="font-semibold">{q.services?.title ?? "Service"}</p>
                <p className="text-sm text-muted-foreground">
                  {q.profile?.full_name ?? q.profile?.email}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPrice(Number(q.quoted_price ?? 0))}</p>
                <p className="text-xs text-muted-foreground">Awaiting payment</p>
              </div>
            </div>
          ))
        )}
      </Section>

      <Section title={`History (${grouped.done.length})`}>
        {grouped.done.length === 0 ? (
          <Empty text="Nothing here yet." />
        ) : (
          grouped.done.map((q) => (
            <div key={q.id} className="flex items-center justify-between rounded-2xl bg-muted/30 p-3 text-sm">
              <span>{q.services?.title}</span>
              <span className="uppercase text-muted-foreground">{q.status}</span>
            </div>
          ))
        )}
      </Section>
    </BusinessLayout>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-5 space-y-3">
    <h2 className="font-display text-base font-bold">{title}</h2>
    <div className="space-y-3">{children}</div>
  </section>
);

const Empty = ({ text }: { text: string }) => (
  <p className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">{text}</p>
);

export default BusinessQuotesPage;

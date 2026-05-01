import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, Send, Star } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOrderById,
  fetchOrderDisputes,
  fetchOrderEvents,
  fetchOrderMessages,
  formatPrice,
  DISPUTE_STATUS_LABEL,
  DISPUTE_STATUS_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  type DisputeStatus,
  type OrderStatus,
} from "@/lib/customer/queries";
import { customerConfirmCompletion, fetchOrderProgress } from "@/lib/business/queries";
import { SignedImage } from "@/components/orders/SignedImage";
import { OpenDisputeButton } from "@/components/orders/OpenDisputeButton";
import { OrderStatusStepper } from "@/components/orders/OrderStatusStepper";
import { cn } from "@/lib/utils";

const OrderDetailPage = () => {
  const { orderId = "" } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [message, setMessage] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [lightboxPath, setLightboxPath] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrderById(orderId),
    enabled: !!orderId,
  });
  const { data: events = [] } = useQuery({
    queryKey: ["order-events", orderId],
    queryFn: () => fetchOrderEvents(orderId),
    enabled: !!orderId,
  });
  const { data: messages = [] } = useQuery({
    queryKey: ["order-messages", orderId],
    queryFn: () => fetchOrderMessages(orderId),
    enabled: !!orderId,
  });
  const { data: progressUpdates = [] } = useQuery({
    queryKey: ["order-progress", orderId],
    queryFn: () => fetchOrderProgress(orderId),
    enabled: !!orderId,
  });
  const { data: disputes = [] } = useQuery({
    queryKey: ["order-disputes", orderId],
    queryFn: () => fetchOrderDisputes(orderId),
    enabled: !!orderId,
  });

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("messages").insert({ order_id: orderId, sender_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["order-messages", orderId] });
    },
    onError: (e) => toast({ title: "Could not send", description: (e as Error).message, variant: "destructive" }),
  });

  const approveCompletion = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      await customerConfirmCompletion(orderId);
    },
    onSuccess: () => {
      toast({ title: "Approved", description: "Thanks — payout queued. Leave a review below." });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["order-events", orderId] });
    },
    onError: (e) => toast({ title: "Could not approve", description: (e as Error).message, variant: "destructive" }),
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user || !order) throw new Error("Missing context");
      const { error } = await supabase.from("reviews").insert({
        order_id: order.id,
        business_id: order.business_id,
        customer_id: user.id,
        rating: reviewRating,
        comment: reviewComment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Review posted", description: "Thanks for the feedback." });
      setReviewComment("");
    },
    onError: (e) => toast({ title: "Could not save review", description: (e as Error).message, variant: "destructive" }),
  });

  const onSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return;
    sendMessage.mutate(message.trim());
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="h-64 animate-pulse rounded-3xl bg-card shadow-card" />
      </CustomerLayout>
    );
  }

  if (!order) {
    return (
      <CustomerLayout>
        <div className="grid place-items-center rounded-3xl bg-card p-10 text-center shadow-card">
          <p className="font-display text-lg font-bold">Order not found</p>
          <Button asChild className="mt-4" variant="secondary">
            <Link to="/customer/orders">
              <ArrowLeft className="h-4 w-4" /> Back to orders
            </Link>
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const status = order.status as OrderStatus;

  const hasActiveDispute = disputes.some((d) => d.status === "open" || d.status === "reviewing");
  const showApprove = status === "ready_for_review" || status === "out_for_delivery" || status === "ready";
  const completed = status === "completed";

  return (
    <CustomerLayout>
      <Link to="/customer/orders" className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All orders
      </Link>

      {/* Compact summary header */}
      <header className="rounded-3xl bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Order #{order.id.slice(0, 8)}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">
              {order.businesses?.name ?? "Provider"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {order.services?.title ?? "Custom order"}
            </p>
          </div>
          <div className="text-right">
            <span className={cn("rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider", STATUS_TONE[status])}>
              {STATUS_LABEL[status]}
            </span>
            <p className="mt-2 font-display text-2xl font-bold">
              {formatPrice(Number(order.total), order.currency)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <OrderStatusStepper status={status} />
        </div>

        {(showApprove || !hasActiveDispute) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {showApprove && (
              <Button size="lg" onClick={() => approveCompletion.mutate()} disabled={approveCompletion.isPending}>
                {approveCompletion.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Approve completion
                  </>
                )}
              </Button>
            )}
            {!hasActiveDispute && !completed && (
              <OpenDisputeButton
                orderId={order.id}
                variant="secondary"
                onOpened={() => qc.invalidateQueries({ queryKey: ["order-disputes", orderId] })}
              />
            )}
          </div>
        )}
      </header>

      {/* Tabs */}
      <Tabs defaultValue="status" className="mt-4">
        <TabsList className="grid w-full grid-cols-4 rounded-2xl bg-card p-1 shadow-card">
          <TabsTrigger value="status" className="rounded-xl">Status</TabsTrigger>
          <TabsTrigger value="messages" className="rounded-xl">Messages</TabsTrigger>
          <TabsTrigger value="files" className="rounded-xl">Files</TabsTrigger>
          <TabsTrigger value="disputes" className="rounded-xl">
            Disputes{disputes.length ? ` (${disputes.length})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* STATUS TAB */}
        <TabsContent value="status" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-3xl bg-card p-5 shadow-card">
              <h2 className="font-display text-base font-bold">Timeline</h2>
              {events.length === 0 ? (
                <p className="mt-3 rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                  No updates yet — your provider will post progress here.
                </p>
              ) : (
                <ol className="mt-4 space-y-4">
                  {events.map((ev, i) => (
                    <li key={ev.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        {i < events.length - 1 ? <div className="mt-1 h-full w-px flex-1 bg-border" /> : null}
                      </div>
                      <div className="pb-4">
                        <p className="font-display text-sm font-bold capitalize">{ev.type.replace(/_/g, " ")}</p>
                        {ev.message ? <p className="mt-1 text-xs text-muted-foreground">{ev.message}</p> : null}
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {new Date(ev.created_at).toLocaleString("en-GB")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {completed ? (
                <div className="mt-6 rounded-2xl bg-muted/40 p-4">
                  <h3 className="font-display text-sm font-bold">Leave a review</h3>
                  <div className="mt-3 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        aria-label={`Rate ${n} stars`}
                        className="text-foreground"
                      >
                        <Star className={cn("h-6 w-6", n <= reviewRating ? "fill-current" : "opacity-30")} />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Tell others how it went."
                    maxLength={500}
                    className="mt-3 min-h-[80px] rounded-2xl border-0 bg-card"
                  />
                  <Button className="mt-3" onClick={() => submitReview.mutate()} disabled={submitReview.isPending}>
                    {submitReview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post review"}
                  </Button>
                </div>
              ) : null}
            </section>

            <aside className="rounded-3xl bg-card p-5 shadow-card">
              <h2 className="font-display text-base font-bold">Order details</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Service">{order.services?.title ?? "—"}</Row>
                <Row label="Total">{formatPrice(Number(order.total), order.currency)}</Row>
                {order.scheduled_for && (
                  <Row label="Scheduled">{new Date(order.scheduled_for).toLocaleString("en-GB")}</Row>
                )}
                <Row label="Placed">{new Date(order.created_at).toLocaleDateString("en-GB")}</Row>
              </dl>

              {order.addresses ? (
                <div className="mt-4 rounded-2xl bg-muted/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Delivery</p>
                  <p className="mt-1 font-display text-sm font-bold">{order.addresses.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.addresses.line1}
                    {order.addresses.line2 ? `, ${order.addresses.line2}` : ""}, {order.addresses.city}
                  </p>
                </div>
              ) : null}

              {order.notes ? (
                <div className="mt-3 rounded-2xl bg-muted/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your notes</p>
                  <p className="mt-1 text-sm">{order.notes}</p>
                </div>
              ) : null}
            </aside>
          </div>
        </TabsContent>

        {/* MESSAGES TAB */}
        <TabsContent value="messages" className="mt-4">
          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Chat with your provider</h2>
            <div className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                  No messages yet — say hi 👋
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      m.sender_id === user?.id ? "ml-auto bg-foreground text-background" : "bg-muted",
                    )}
                  >
                    <p>{m.body}</p>
                    <p className={cn("mt-1 text-[10px]", m.sender_id === user?.id ? "text-background/70" : "text-muted-foreground")}>
                      {new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={onSendMessage} className="mt-3 flex gap-2">
              <Label htmlFor="message" className="sr-only">Message</Label>
              <Input
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a message…"
                maxLength={500}
                className="h-11 rounded-2xl border-0 bg-muted"
              />
              <Button type="submit" size="lg" disabled={!message.trim() || sendMessage.isPending}>
                {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </section>
        </TabsContent>

        {/* FILES TAB */}
        <TabsContent value="files" className="mt-4">
          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Photos &amp; progress updates</h2>
            {progressUpdates.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                Photos and notes from your provider will appear here.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {progressUpdates.map((p) => (
                  <li key={p.id} className="rounded-2xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {p.stage ?? "update"}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {new Date(p.created_at).toLocaleString("en-GB")}
                      </span>
                    </div>
                    {p.note ? <p className="mt-2 text-sm">{p.note}</p> : null}
                    {p.media_urls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {p.media_urls.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setLightboxPath(u)}
                            className="block h-24 w-24 overflow-hidden rounded-xl bg-muted ring-offset-background transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            aria-label="View proof photo full size"
                          >
                            <SignedImage path={u} alt="Progress proof" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>

        {/* DISPUTES TAB */}
        <TabsContent value="disputes" className="mt-4">
          <section className="rounded-3xl bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Dispute history</h2>
              {!hasActiveDispute && !completed && (
                <OpenDisputeButton
                  orderId={order.id}
                  variant="secondary"
                  onOpened={() => qc.invalidateQueries({ queryKey: ["order-disputes", orderId] })}
                />
              )}
            </div>
            {disputes.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                No disputes raised on this order. If something's wrong, tap "Report a problem".
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {disputes.map((d) => {
                  const dStatus = d.status as DisputeStatus;
                  const isResolved = dStatus === "resolved" || dStatus === "rejected";
                  return (
                    <li key={d.id} className="rounded-2xl border border-border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider", DISPUTE_STATUS_TONE[dStatus])}>
                          {DISPUTE_STATUS_LABEL[dStatus]}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Opened {new Date(d.created_at).toLocaleDateString("en-GB")}
                        </span>
                        {isResolved && d.resolved_at && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            · Closed {new Date(d.resolved_at).toLocaleDateString("en-GB")}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 font-display text-sm font-bold">{d.reason}</p>
                      {d.details && <p className="mt-1 text-sm text-muted-foreground">{d.details}</p>}
                      {isResolved ? (
                        <div className="mt-3 rounded-2xl bg-muted/60 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resolution</p>
                          <p className="mt-1 text-sm">
                            {d.resolution?.trim()
                              ? d.resolution
                              : dStatus === "rejected"
                                ? "Admin reviewed this case and closed it without changes."
                                : "Admin marked this case as resolved."}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">
                          An admin is reviewing your case. You'll get a notification when there's an update.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={!!lightboxPath} onOpenChange={(open) => !open && setLightboxPath(null)}>
        <DialogContent className="max-w-3xl border-0 bg-transparent p-0 shadow-none">
          {lightboxPath ? (
            <div className="overflow-hidden rounded-2xl bg-black">
              <SignedImage path={lightboxPath} alt="Proof photo full size" className="h-auto w-full object-contain" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="text-right text-sm font-semibold">{children}</dd>
  </div>
);

export { OrderDetailPage };
export default OrderDetailPage;

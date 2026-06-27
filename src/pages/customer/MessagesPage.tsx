import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, MessageSquare, ArrowRight, ArrowLeft } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyOrders, fetchOrderMessages } from "@/lib/customer/queries";
import { useRealtimeInvalidate } from "@/lib/cache";
import { cn } from "@/lib/utils";

type Thread = {
  orderId: string;
  providerName: string;
  serviceTitle: string;
  lastBody: string | null;
  lastAt: string | null;
  unread: number;
};

const fetchCustomerThreads = async (userId: string): Promise<Thread[]> => {
  const orders = await fetchMyOrders(userId);
  const active = orders.filter((o) => o.status !== "cancelled");
  if (active.length === 0) return [];
  const orderIds = active.map((o) => o.id);
  const { data: msgs } = await supabase
    .from("messages")
    .select("order_id, body, created_at, sender_id, read_at")
    .in("order_id", orderIds)
    .order("created_at", { ascending: false });

  return active
    .map((o) => {
      const orderMsgs = (msgs ?? []).filter((m) => m.order_id === o.id);
      const last = orderMsgs[0];
      const unread = orderMsgs.filter((m) => m.sender_id !== userId && !m.read_at).length;
      return {
        orderId: o.id,
        providerName: o.businesses?.name ?? "Provider",
        serviceTitle: o.services?.title ?? "Custom order",
        lastBody: last?.body ?? null,
        lastAt: last?.created_at ?? null,
        unread,
      };
    })
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
};

const MessagesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrder = searchParams.get("order");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(initialOrder);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["customer-threads", user?.id],
    queryFn: () => fetchCustomerThreads(user!.id),
    enabled: !!user,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches && !activeOrderId && threads.length > 0) {
      setActiveOrderId(threads[0].orderId);
    }
  }, [threads, activeOrderId]);

  const { data: messages = [] } = useQuery({
    queryKey: ["order-messages", activeOrderId],
    queryFn: () => fetchOrderMessages(activeOrderId!),
    enabled: !!activeOrderId,
    refetchInterval: 8000,
  });

  useRealtimeInvalidate(
    user ? [{ table: "messages" }] : [],
    [["customer-threads", user?.id], ["order-messages", activeOrderId]],
    { enabled: !!user },
  );

  // Mark unread as read on open.
  useEffect(() => {
    if (!activeOrderId || !user) return;
    const unreadIds = messages.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => qc.invalidateQueries({ queryKey: ["customer-threads", user.id] }));
  }, [activeOrderId, messages, user, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Keep URL in sync with selection.
  useEffect(() => {
    if (!activeOrderId) return;
    if (searchParams.get("order") !== activeOrderId) {
      setSearchParams({ order: activeOrderId }, { replace: true });
    }
  }, [activeOrderId, searchParams, setSearchParams]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      if (!user || !activeOrderId) throw new Error("Pick a conversation first.");
      const { error } = await supabase
        .from("messages")
        .insert({ order_id: activeOrderId, sender_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["order-messages", activeOrderId] });
      qc.invalidateQueries({ queryKey: ["customer-threads", user?.id] });
    },
    onError: (e: Error) => toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.trim()) return;
    send.mutate(draft.trim());
  };

  const active = useMemo(() => threads.find((t) => t.orderId === activeOrderId), [threads, activeOrderId]);

  return (
    <CustomerLayout>
      <PageHeader
        eyebrow="Inbox"
        title="Messages"
        description="Chat directly with your providers about each order."
      />

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : threads.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="grid place-items-center gap-2 p-10 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="font-display text-base font-bold">No conversations yet</p>
            <p className="text-sm text-muted-foreground">
              Place an order to start chatting with a provider.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card
            className={cn(
              "rounded-3xl border-0 shadow-card",
              activeOrderId ? "hidden lg:block" : "block",
            )}
          >
            <CardContent className="space-y-1 p-2">
              {threads.map((t) => (
                <button
                  key={t.orderId}
                  onClick={() => setActiveOrderId(t.orderId)}
                  className={cn(
                    "w-full rounded-2xl p-3 text-left transition-colors",
                    activeOrderId === t.orderId ? "bg-foreground text-background" : "hover:bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-display text-sm font-bold">{t.providerName}</p>
                    {t.unread > 0 && (
                      <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <p className={cn("mt-0.5 truncate text-xs", activeOrderId === t.orderId ? "text-background/80" : "text-muted-foreground")}>
                    {t.serviceTitle}
                  </p>
                  <p className={cn("mt-1 truncate text-xs", activeOrderId === t.orderId ? "text-background/70" : "text-muted-foreground")}>
                    {t.lastBody ?? "No messages yet"}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card
            className={cn(
              "rounded-3xl border-0 shadow-card",
              activeOrderId ? "block" : "hidden lg:block",
            )}
          >
            <CardContent className="flex h-[70vh] flex-col p-0">
              {active ? (
                <>
                  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 md:px-5">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveOrderId(null)}
                        aria-label="Back to conversations"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground hover:bg-primary/15 hover:text-primary lg:hidden"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-bold">{active.providerName}</p>
                        <p className="truncate text-xs text-muted-foreground">{active.serviceTitle}</p>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="secondary">
                      <Link to={`/customer/orders/${active.orderId}`}>
                        Open order <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>


                  <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-5">
                    {messages.length === 0 ? (
                      <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                        No messages yet — say hello.
                      </p>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m.id}
                          className={cn(
                            "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                            m.sender_id === user?.id
                              ? "ml-auto bg-foreground text-background"
                              : "bg-muted text-foreground",
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={cn("mt-1 text-[10px]", m.sender_id === user?.id ? "text-background/70" : "text-muted-foreground")}>
                            {new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={onSubmit} className="flex gap-2 border-t border-border p-3">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Write a message…"
                      maxLength={500}
                      className="h-11 rounded-2xl border-0 bg-muted"
                    />
                    <Button type="submit" size="lg" disabled={!draft.trim() || send.isPending}>
                      {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
                  Pick a conversation to start chatting.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </CustomerLayout>
  );
};

export { MessagesPage };
export default MessagesPage;

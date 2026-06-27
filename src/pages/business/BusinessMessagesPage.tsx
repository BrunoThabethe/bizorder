import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, MessageSquare, ArrowRight, ArrowLeft } from "lucide-react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyBusiness, fetchBusinessOrders } from "@/lib/business/queries";
import { cn } from "@/lib/utils";

type Thread = {
  orderId: string;
  customerName: string;
  serviceTitle: string;
  lastBody: string | null;
  lastAt: string | null;
  unread: number;
};

const fetchThreads = async (businessId: string, ownerId: string): Promise<Thread[]> => {
  const orders = await fetchBusinessOrders(businessId);
  if (orders.length === 0) return [];
  const orderIds = orders.map((o) => o.id);
  const { data: msgs } = await supabase
    .from("messages")
    .select("order_id, body, created_at, sender_id, read_at")
    .in("order_id", orderIds)
    .order("created_at", { ascending: false });

  return orders
    .map((o) => {
      const orderMsgs = (msgs ?? []).filter((m) => m.order_id === o.id);
      const last = orderMsgs[0];
      const unread = orderMsgs.filter((m) => m.sender_id !== ownerId && !m.read_at).length;
      return {
        orderId: o.id,
        customerName: o.profiles?.full_name ?? o.profiles?.email ?? "Customer",
        serviceTitle: (o as { services?: { title?: string } | null }).services?.title ?? "Custom order",
        lastBody: last?.body ?? null,
        lastAt: last?.created_at ?? null,
        unread,
      };
    })
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
};

const fetchThreadMessages = async (orderId: string) => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
};

const BusinessMessagesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: business } = useQuery({
    queryKey: ["my-business", user?.id],
    queryFn: () => fetchMyBusiness(user!.id),
    enabled: !!user,
  });

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["business-threads", business?.id],
    queryFn: () => fetchThreads(business!.id, user!.id),
    enabled: !!business && !!user,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches && !activeOrderId && threads.length > 0) {
      setActiveOrderId(threads[0].orderId);
    }
  }, [threads, activeOrderId]);

  const { data: messages = [] } = useQuery({
    queryKey: ["thread-messages", activeOrderId],
    queryFn: () => fetchThreadMessages(activeOrderId!),
    enabled: !!activeOrderId,
    refetchInterval: 8000,
  });

  // Mark unread messages as read when opening a thread.
  useEffect(() => {
    if (!activeOrderId || !user) return;
    const unreadIds = messages.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => qc.invalidateQueries({ queryKey: ["business-threads", business?.id] }));
  }, [activeOrderId, messages, user, qc, business?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
      qc.invalidateQueries({ queryKey: ["thread-messages", activeOrderId] });
      qc.invalidateQueries({ queryKey: ["business-threads", business?.id] });
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
    <BusinessLayout>
      <PageHeader
        eyebrow="Inbox"
        title="Messages"
        description="Chat with customers about their orders."
      />

      {!business ? (
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Set up your business profile to start receiving messages.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : threads.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="grid place-items-center gap-2 p-10 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="font-display text-base font-bold">No conversations yet</p>
            <p className="text-sm text-muted-foreground">
              Once customers place orders, their messages will show up here.
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
                    <p className="truncate font-display text-sm font-bold">{t.customerName}</p>
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
                        <p className="truncate font-display text-base font-bold">{active.customerName}</p>
                        <p className="truncate text-xs text-muted-foreground">{active.serviceTitle}</p>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="secondary">
                      <Link to={`/business/orders/${active.orderId}`}>
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
                      placeholder="Write a reply…"
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
    </BusinessLayout>
  );
};

export { BusinessMessagesPage };
export default BusinessMessagesPage;

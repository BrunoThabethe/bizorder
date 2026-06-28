import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  CircleDot,
  Clock,
  FileWarning,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  ShieldAlert,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SignedImage } from "@/components/orders/SignedImage";
import { fetchAdminOrderDetail, formatPrice } from "@/lib/admin/queries";
import { useRealtimeInvalidate } from "@/lib/cache";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  pending: "bg-foreground text-background",
  accepted: "bg-foreground/15 text-foreground",
  in_progress: "bg-foreground/85 text-background",
  ready: "bg-foreground/20 text-foreground",
  out_for_delivery: "bg-foreground/30 text-foreground",
  ready_for_review: "bg-foreground text-background",
  completed: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-destructive/15 text-destructive",
};

const EVENT_ICON: Record<string, typeof CircleDot> = {
  pending: Clock,
  accepted: CheckCircle2,
  in_progress: CircleDot,
  ready: CircleDot,
  out_for_delivery: CircleDot,
  ready_for_review: CircleDot,
  completed: CheckCircle2,
  cancelled: XCircle,
  customer_confirmed: CheckCircle2,
  dispute_opened: ShieldAlert,
  progress_update: Camera,
  eta_updated: Clock,
};

const EVENT_LABEL: Record<string, string> = {
  pending: "Order placed",
  accepted: "Provider accepted",
  in_progress: "Work started",
  ready: "Marked ready",
  out_for_delivery: "Out for delivery",
  ready_for_review: "Sent for customer approval",
  completed: "Marked completed",
  cancelled: "Cancelled / Rejected",
  customer_confirmed: "Customer confirmed completion",
  dispute_opened: "Dispute opened",
  progress_update: "Progress update posted",
  eta_updated: "ETA updated",
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const initialsOf = (name: string | null | undefined, email: string | null | undefined) => {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s@]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "");
};

const AdminOrderDetailPage = () => {
  const { orderId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order", orderId],
    queryFn: () => fetchAdminOrderDetail(orderId),
    enabled: !!orderId,
  });

  useRealtimeInvalidate(
    [
      { table: "orders", filter: `id=eq.${orderId}` },
      { table: "order_events", filter: `order_id=eq.${orderId}` },
      { table: "order_progress", filter: `order_id=eq.${orderId}` },
      { table: "messages", filter: `order_id=eq.${orderId}` },
      { table: "disputes", filter: `order_id=eq.${orderId}` },
    ],
    [["admin", "order", orderId]],
    { enabled: !!orderId },
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!data || !data.order) {
    return (
      <AdminLayout>
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-3 p-8 text-center">
            <h1 className="font-display text-2xl font-bold">Order not found</h1>
            <p className="text-sm text-muted-foreground">It may have been removed or the link is incorrect.</p>
            <Button asChild variant="secondary">
              <Link to="/admin/orders">
                <ArrowLeft className="h-4 w-4" /> Back to orders
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const { order, customer, events, progress, messages, tasks, dispute, payment, actors } = data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = order as any;
  const business = o.businesses ?? null;
  const ownerProfile = business?.owner_id ? actors[business.owner_id] : null;

  // Build a unified timeline: events + progress proofs + messages
  type TimelineItem =
    | { kind: "event"; id: string; at: string; type: string; actorId: string | null; message: string | null }
    | { kind: "progress"; id: string; at: string; authorId: string; note: string | null; mediaUrls: string[]; stage: string | null }
    | { kind: "message"; id: string; at: string; senderId: string; body: string };

  const timeline: TimelineItem[] = [
    ...events.map((e) => ({
      kind: "event" as const,
      id: e.id,
      at: e.created_at,
      type: e.type,
      actorId: e.actor_id,
      message: e.message,
    })),
    ...progress.map((p) => ({
      kind: "progress" as const,
      id: p.id,
      at: p.created_at,
      authorId: p.author_id,
      note: p.note,
      mediaUrls: p.media_urls ?? [],
      stage: p.stage,
    })),
    ...messages.map((m) => ({
      kind: "message" as const,
      id: m.id,
      at: m.created_at,
      senderId: m.sender_id,
      body: m.body,
    })),
  ].sort((a, b) => +new Date(a.at) - +new Date(b.at));

  const acceptedEvent = events.find((e) => e.type === "accepted");
  const cancelledEvent = events.find((e) => e.type === "cancelled");
  const completedEvent =
    events.find((e) => e.type === "customer_confirmed") ?? events.find((e) => e.type === "completed");

  const proofPhotos = progress.flatMap((p) => p.media_urls ?? []);

  const actorName = (id: string | null | undefined) => {
    if (!id) return "System";
    const a = actors[id];
    if (!a) return "Unknown user";
    return a.full_name || a.email || "User";
  };

  const actorRole = (id: string | null | undefined) => {
    if (!id) return "";
    if (id === o.customer_id) return "Customer";
    if (business && id === business.owner_id) return "Provider";
    return "Crew / Admin";
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button asChild variant="secondary" size="sm">
              <Link to="/admin/orders">
                <ArrowLeft className="h-4 w-4" /> Back to orders
              </Link>
            </Button>
            <h1 className="mt-3 font-display text-3xl font-bold">
              {o.services?.title ?? "Custom order"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Order #{o.id.slice(0, 8)} · placed {formatDateTime(o.created_at)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={cn("border-0", STATUS_TONE[o.status] ?? "bg-muted text-foreground")}>
              {String(o.status).replace(/_/g, " ")}
            </Badge>
            <span className="font-display text-2xl font-bold">{formatPrice(Number(o.total ?? 0), o.currency)}</span>
            <span className="text-xs font-semibold text-muted-foreground">
              {payment?.status === "funded" || payment?.status === "released" ? "Paid" : "Payment not confirmed"}
            </span>
          </div>
        </div>

        {/* Parties */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="space-y-3 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {customer?.avatar_url ? <AvatarImage src={customer.avatar_url} alt="" /> : null}
                  <AvatarFallback className="bg-foreground text-background">
                    {initialsOf(customer?.full_name, customer?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold">{customer?.full_name ?? "—"}</p>
                  {customer?.email ? (
                    <a
                      href={`mailto:${customer.email}`}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="h-3 w-3" /> {customer.email}
                    </a>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Placed the order on <span className="font-semibold text-foreground">{formatDateTime(o.created_at)}</span>
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="space-y-3 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Provider</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-foreground text-background">
                    {initialsOf(business?.name, ownerProfile?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold">{business?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    Owner: {ownerProfile?.full_name ?? ownerProfile?.email ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {business?.email ? (
                  <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{business.email}</span>
                ) : null}
                {business?.phone ? (
                  <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{business.phone}</span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key milestones strip */}
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="grid gap-4 p-5 md:grid-cols-4">
            <Milestone
              icon={Clock}
              label="Placed"
              who={customer?.full_name ?? customer?.email ?? "Customer"}
              when={formatDateTime(o.created_at)}
              tone="default"
            />
            <Milestone
              icon={CheckCircle2}
              label="Accepted"
              who={acceptedEvent ? actorName(acceptedEvent.actor_id) : "—"}
              when={acceptedEvent ? formatDateTime(acceptedEvent.created_at) : "Not yet"}
              tone={acceptedEvent ? "success" : "muted"}
            />
            <Milestone
              icon={XCircle}
              label="Rejected / Cancelled"
              who={cancelledEvent ? actorName(cancelledEvent.actor_id) : "—"}
              when={cancelledEvent ? formatDateTime(cancelledEvent.created_at) : "Not cancelled"}
              tone={cancelledEvent ? "destructive" : "muted"}
            />
            <Milestone
              icon={CheckCircle2}
              label="Completed"
              who={completedEvent ? actorName(completedEvent.actor_id) : "—"}
              when={completedEvent ? formatDateTime(completedEvent.created_at) : "Not yet"}
              tone={completedEvent ? "success" : "muted"}
            />
          </CardContent>
        </Card>

        {/* Cancellation reason */}
        {o.status === "cancelled" && o.rejected_reason ? (
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="flex items-start gap-3 p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <XCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg font-bold">Order cancelled by provider</p>
                <p className="text-sm text-muted-foreground">Reason: {o.rejected_reason}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}


        {dispute ? (
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="flex items-start gap-3 p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <FileWarning className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg font-bold">Dispute is {dispute.status}</p>
                <p className="text-sm text-muted-foreground">{dispute.reason}</p>
                {dispute.details ? <p className="mt-1 text-xs text-muted-foreground">{dispute.details}</p> : null}
              </div>
              <Button asChild variant="secondary" size="sm" className="ml-auto">
                <Link to="/admin/disputes">Open</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Crew assignments */}
        {tasks.length > 0 ? (
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="space-y-3 p-5">
              <h2 className="font-display text-lg font-bold">Crew assignments</h2>
              <div className="space-y-2">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Assigned {formatDateTime(t.created_at)}
                        {t.crew_member_id ? "" : " · Unassigned"}
                      </p>
                    </div>
                    <Badge className="border-0 bg-foreground/10 text-foreground">{t.status.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Proof gallery */}
        {proofPhotos.length > 0 ? (
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Proof photos</h2>
                <span className="text-xs text-muted-foreground">{proofPhotos.length} total</span>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {proofPhotos.map((path) => (
                  <SignedImage
                    key={path}
                    path={path}
                    alt="Proof photo"
                    className="aspect-square w-full rounded-2xl object-cover"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Timeline */}
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-4 p-5">
            <h2 className="font-display text-lg font-bold">Full timeline</h2>
            {timeline.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing recorded yet.</p>
            ) : (
              <ol className="relative space-y-5 border-l border-border pl-6">
                {timeline.map((item) => {
                  const actorId =
                    item.kind === "event" ? item.actorId : item.kind === "progress" ? item.authorId : item.senderId;
                  const a = actorId ? actors[actorId] : null;
                  const Icon =
                    item.kind === "message"
                      ? MessageSquare
                      : item.kind === "progress"
                      ? Camera
                      : EVENT_ICON[item.type] ?? CircleDot;
                  return (
                    <li key={`${item.kind}-${item.id}`} className="relative">
                      <span className="absolute -left-[33px] top-0 grid h-7 w-7 place-items-center rounded-full bg-foreground text-background ring-4 ring-background">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex flex-wrap items-start gap-3">
                        <Avatar className="h-9 w-9">
                          {a?.avatar_url ? <AvatarImage src={a.avatar_url} alt="" /> : null}
                          <AvatarFallback className="bg-muted text-xs">
                            {actorId ? initialsOf(a?.full_name, a?.email) : <UserIcon className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-semibold">{actorName(actorId)}</span>{" "}
                            <span className="text-xs text-muted-foreground">· {actorRole(actorId)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(item.at)}</p>
                          {item.kind === "event" ? (
                            <p className="mt-1 text-sm">
                              {EVENT_LABEL[item.type] ?? item.type.replace(/_/g, " ")}
                              {item.message ? <span className="text-muted-foreground"> — {item.message}</span> : null}
                            </p>
                          ) : item.kind === "message" ? (
                            <div className="mt-2 rounded-2xl bg-muted px-3 py-2 text-sm">{item.body}</div>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {item.note ? (
                                <p className="rounded-2xl bg-muted px-3 py-2 text-sm">{item.note}</p>
                              ) : null}
                              {item.mediaUrls.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                  {item.mediaUrls.map((path) => (
                                    <SignedImage
                                      key={path}
                                      path={path}
                                      alt="Proof"
                                      className="aspect-square w-full rounded-xl object-cover"
                                    />
                                  ))}
                                </div>
                              ) : null}
                              {item.stage ? (
                                <Badge className="border-0 bg-foreground/10 text-foreground">
                                  Stage: {item.stage.replace(/_/g, " ")}
                                </Badge>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

type MilestoneTone = "default" | "success" | "destructive" | "muted";

const Milestone = ({
  icon: Icon,
  label,
  who,
  when,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  who: string;
  when: string;
  tone: MilestoneTone;
}) => {
  const tones: Record<MilestoneTone, string> = {
    default: "bg-foreground text-background",
    success: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    destructive: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="flex items-start gap-3">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{who}</p>
        <p className="truncate text-xs text-muted-foreground">{when}</p>
      </div>
    </div>
  );
};

export default AdminOrderDetailPage;

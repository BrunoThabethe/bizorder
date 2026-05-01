import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, Send, UploadCloud, X } from "lucide-react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchBusinessOrderById,
  fetchCrew,
  fetchOrderProgress,
  fetchOrderTasks,
  formatPrice,
  isProofPhoto,
  proofPhotoAccept,
  STATUS_LABEL,
  STATUS_TONE,
  uploadOrderMedia,
  sb,
  type OrderStatus,
} from "@/lib/business/queries";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/orders/SignedImage";
import { OpenDisputeButton } from "@/components/orders/OpenDisputeButton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Statuses the provider can move to from a non-pending state.
const PROVIDER_NEXT_STATUSES: OrderStatus[] = [
  "in_progress",
  "ready",
  "out_for_delivery",
  "ready_for_review",
  "cancelled",
];

const BusinessOrderDetailPage = () => {
  const { orderId = "" } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["business-order", orderId],
    queryFn: () => fetchBusinessOrderById(orderId),
    enabled: !!orderId,
  });

  const businessId = (order as { business_id?: string } | null)?.business_id ?? "";

  const { data: progress = [] } = useQuery({
    queryKey: ["order-progress", orderId],
    queryFn: () => fetchOrderProgress(orderId),
    enabled: !!orderId,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["order-tasks", orderId],
    queryFn: () => fetchOrderTasks(orderId),
    enabled: !!orderId,
  });
  const { data: crew = [] } = useQuery({
    queryKey: ["business-crew", businessId],
    queryFn: () => fetchCrew(businessId),
    enabled: !!businessId,
  });

  const [eta, setEta] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<string>("in_progress");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskInstructions, setTaskInstructions] = useState("");
  const [taskCrew, setTaskCrew] = useState<string>("");

  const setStatus = useMutation({
    mutationFn: async (next: OrderStatus) => {
      const patch: { status: OrderStatus; estimated_completion_at?: string; rejected_reason?: string } = { status: next };
      if (next === "accepted" && eta) patch.estimated_completion_at = new Date(eta).toISOString();
      if (next === "cancelled" && rejectReason) patch.rejected_reason = rejectReason;
      const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
      if (error) throw error;
      await supabase.from("order_events").insert({ order_id: orderId, type: next, actor_id: user!.id, message: null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-order", orderId] });
      toast({ title: "Order updated" });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const updateEta = useMutation({
    mutationFn: async () => {
      if (!eta) throw new Error("Pick a date and time");
      const { error } = await supabase
        .from("orders")
        .update({ estimated_completion_at: new Date(eta).toISOString() })
        .eq("id", orderId);
      if (error) throw error;
      await supabase.from("order_events").insert({
        order_id: orderId,
        type: "eta_updated",
        actor_id: user!.id,
        message: `New ETA: ${new Date(eta).toLocaleString("en-ZA")}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-order", orderId] });
      toast({ title: "Estimated completion updated" });
    },
    onError: (e: Error) => toast({ title: "Could not update", description: e.message, variant: "destructive" }),
  });

  const addProgress = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      if (!businessId) throw new Error("Order is still loading — try again in a moment.");
      setUploading(true);
      const paths: string[] = [];
      for (const f of files) paths.push(await uploadOrderMedia(orderId, f));
      // Use the server-side RPC so RLS, timeline mirroring and customer
      // notification all happen atomically with the proper privileges.
      const { error } = await sb.rpc("post_order_progress_update", {
        _order_id: orderId,
        _business_id: businessId,
        _task_id: null,
        _note: note || null,
        _media_urls: paths,
        _stage: stage,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNote("");
      setFiles([]);
      setUploading(false);
      qc.invalidateQueries({ queryKey: ["order-progress", orderId] });
      qc.invalidateQueries({ queryKey: ["business-order", orderId] });
      toast({ title: "Update posted", description: "The customer has been notified." });
    },
    onError: (e: Error) => {
      setUploading(false);
      toast({ title: "Could not post update", description: e.message, variant: "destructive" });
    },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      const { data: inserted, error } = await sb
        .from("order_tasks")
        .insert({
          order_id: orderId,
          business_id: businessId,
          crew_member_id: taskCrew || null,
          title: taskTitle,
          instructions: taskInstructions || null,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (error) throw error;

      // Notify the assigned crew member, if any
      if (taskCrew) {
        const member = crew.find((c) => c.id === taskCrew);
        if (member?.user_id) {
          await supabase.from("notifications").insert({
            user_id: member.user_id,
            type: "task_assigned",
            title: "New task assigned",
            body: `"${taskTitle}" — open to view instructions.`,
            link: inserted?.id ? `/crew/tasks/${inserted.id}` : "/crew/tasks",
          });
        }
      }
    },
    onSuccess: () => {
      setTaskTitle("");
      setTaskInstructions("");
      setTaskCrew("");
      qc.invalidateQueries({ queryKey: ["order-tasks", orderId] });
      toast({ title: "Task assigned" });
    },
    onError: (e: Error) => toast({ title: "Could not add task", description: e.message, variant: "destructive" }),
  });

  const o = order as
    | (null | {
        id: string;
        status: OrderStatus;
        total: number;
        currency: string;
        created_at: string;
        scheduled_for: string | null;
        notes: string | null;
        estimated_completion_at: string | null;
        services?: { title: string; description: string | null } | null;
        addresses?: {
          recipient: string;
          line1: string;
          line2: string | null;
          city: string;
          postal_code: string | null;
          country: string;
        } | null;
        profiles?: { full_name: string | null; email: string } | null;
      })
    | undefined;

  const filePreviews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files],
  );

  if (isLoading) {
    return (
      <BusinessLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </BusinessLayout>
    );
  }

  if (!o) {
    return (
      <BusinessLayout>
        <PageHeader title="Order not found" description="The order may have been removed." />
        <Button asChild variant="secondary">
          <Link to="/business/orders">
            <ArrowLeft className="h-4 w-4" /> Back to queue
          </Link>
        </Button>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow={`Order #${o.id.slice(0, 8)}`}
        title={o.services?.title ?? "Custom order"}
        description={`From ${o.profiles?.full_name ?? o.profiles?.email ?? "customer"} on ${new Date(o.created_at).toLocaleString("en-ZA")}`}
        action={
          <Button asChild variant="secondary">
            <Link to="/business/orders">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_TONE[o.status])}>
                  {STATUS_LABEL[o.status]}
                </span>
                <span className="font-display text-xl font-bold">{formatPrice(Number(o.total), o.currency)}</span>
                {o.estimated_completion_at ? (
                  <span className="text-xs text-muted-foreground">
                    ETA {new Date(o.estimated_completion_at).toLocaleString("en-ZA")}
                  </span>
                ) : null}
              </div>

              {o.notes ? <p className="rounded-2xl bg-muted p-3 text-sm">{o.notes}</p> : null}

              {o.addresses ? (
                <div className="rounded-2xl bg-muted p-3 text-sm">
                  <p className="font-semibold">{o.addresses.recipient}</p>
                  <p className="text-muted-foreground">
                    {o.addresses.line1}
                    {o.addresses.line2 ? `, ${o.addresses.line2}` : ""}, {o.addresses.city}
                    {o.addresses.postal_code ? ` ${o.addresses.postal_code}` : ""}
                  </p>
                </div>
              ) : null}

              {o.status === "pending" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border p-3">
                    <Label htmlFor="eta">Estimated completion</Label>
                    <Input id="eta" type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} className="mt-2" />
                    <Button className="mt-3 w-full" onClick={() => setStatus.mutate("accepted")} disabled={setStatus.isPending}>
                      Accept order
                    </Button>
                  </div>
                  <div className="rounded-2xl border border-border p-3">
                    <Label htmlFor="reject">Reject reason (optional)</Label>
                    <Input
                      id="reject"
                      placeholder="Why can't you take this?"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      maxLength={200}
                      className="mt-2"
                    />
                    <Button
                      variant="secondary"
                      className="mt-3 w-full"
                      onClick={() => setStatus.mutate("cancelled")}
                      disabled={setStatus.isPending}
                    >
                      Reject order
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-border p-3">
                    <Label htmlFor="eta-edit">Update estimated completion</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Input
                        id="eta-edit"
                        type="datetime-local"
                        value={eta}
                        onChange={(e) => setEta(e.target.value)}
                        className="h-10 max-w-[260px]"
                      />
                      <Button onClick={() => updateEta.mutate()} disabled={!eta || updateEta.isPending}>
                        Save ETA
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PROVIDER_NEXT_STATUSES.filter((s) => s !== o.status).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="secondary"
                        onClick={() => setStatus.mutate(s)}
                        disabled={setStatus.isPending}
                      >
                        Move to {STATUS_LABEL[s]}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The customer marks the order completed after you set it to "Awaiting your confirmation".
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="space-y-4 p-5">
              <h2 className="font-display text-lg font-bold">Post a progress update</h2>
              <Textarea
                placeholder="Tell the customer what just happened…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
              />
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm font-semibold hover:bg-muted">
                  <UploadCloud className="h-4 w-4" /> Attach proof photos
                  <input
                    type="file"
                    multiple
                    accept={proofPhotoAccept}
                    className="sr-only"
                    onChange={(e) => {
                      const selected = Array.from(e.target.files ?? []);
                      const photos = selected.filter(isProofPhoto).slice(0, 6);
                      setFiles(photos);
                      if (selected.length !== photos.length) {
                        toast({ title: "Only photos can be used as proof", description: "Upload JPG, PNG, or WebP images only.", variant: "destructive" });
                      }
                    }}
                  />
                </label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="ready">Ready for pickup</SelectItem>
                    <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filePreviews.map((f, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl bg-muted">
                      <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background"
                        aria-label="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={() => addProgress.mutate()} disabled={uploading || (!note && files.length === 0)}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post update
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="space-y-3 p-5">
              <h2 className="font-display text-lg font-bold">Progress timeline</h2>
              {progress.length === 0 ? (
                <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">No updates yet. Post the first one above.</p>
              ) : (
                <ul className="space-y-3">
                  {progress.map((p) => (
                    <li key={p.id} className="rounded-2xl border border-border p-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold uppercase tracking-wider">{p.stage ?? "update"}</span>
                        <span>{new Date(p.created_at).toLocaleString("en-ZA")}</span>
                      </div>
                      {p.note ? <p className="text-sm">{p.note}</p> : null}
                      {p.media_urls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {p.media_urls.map((u) => (
                            <div key={u} className="block h-20 w-20 overflow-hidden rounded-xl bg-muted">
                              <SignedImage path={u} alt="proof" className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="space-y-3 p-5">
              <h2 className="font-display text-lg font-bold">Crew tasks</h2>
              <div className="space-y-2">
                <Input placeholder="Task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} maxLength={120} />
                <Textarea
                  placeholder="Instructions"
                  value={taskInstructions}
                  onChange={(e) => setTaskInstructions(e.target.value)}
                  maxLength={500}
                />
                <Select value={taskCrew} onValueChange={setTaskCrew}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to crew (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {crew
                      .filter((c) => c.is_active)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.display_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={() => addTask.mutate()} disabled={!taskTitle}>
                  Add task
                </Button>
              </div>
              <ul className="mt-3 space-y-2">
                {tasks.map((t) => {
                  const owner = crew.find((c) => c.id === t.crew_member_id);
                  return (
                    <li key={t.id} className="rounded-2xl border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{t.title}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            t.status === "done"
                              ? "bg-foreground text-background"
                              : t.status === "in_progress"
                                ? "bg-foreground/20"
                                : "bg-muted",
                          )}
                        >
                          {t.status === "done" ? "Done" : t.status === "in_progress" ? "In progress" : "Pending"}
                        </span>
                      </div>
                      {t.instructions ? <p className="mt-1 text-xs text-muted-foreground">{t.instructions}</p> : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {owner ? `Assigned to ${owner.display_name}` : "Unassigned"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="p-5">
              <h2 className="mb-2 font-display text-lg font-bold">Quick actions</h2>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => setStatus.mutate("ready")} disabled={setStatus.isPending}>
                  <CheckCircle2 className="h-4 w-4" /> Mark ready for pickup
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => setStatus.mutate("out_for_delivery")}
                  disabled={setStatus.isPending}
                >
                  Mark out for delivery
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => setStatus.mutate("ready_for_review")}
                  disabled={setStatus.isPending}
                >
                  Send for customer confirmation
                </Button>
                <p className="pt-1 text-[11px] text-muted-foreground">
                  The customer marks the order completed and triggers the payout.
                </p>
                <OpenDisputeButton orderId={orderId} fullWidth />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
};

export { BusinessOrderDetailPage };
export default BusinessOrderDetailPage;

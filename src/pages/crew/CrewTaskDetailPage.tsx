import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, Loader2, UploadCloud, X } from "lucide-react";
import { CrewLayout } from "@/components/crew/CrewLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  fetchCrewTaskById,
  fetchOrderTasksForOrder,
  fetchTaskProgress,
  sb,
  uploadOrderMedia,
  type OrderTask,
} from "@/lib/business/queries";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/orders/SignedImage";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<OrderTask["status"], string> = {
  pending: "bg-muted text-foreground",
  in_progress: "bg-foreground/15 text-foreground",
  done: "bg-foreground text-background",
};

const CrewTaskDetailPage = () => {
  const { taskId = "" } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: ["crew-task", taskId],
    queryFn: () => fetchCrewTaskById(taskId),
    enabled: !!taskId,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["task-progress", taskId],
    queryFn: () => fetchTaskProgress(taskId),
    enabled: !!taskId,
  });

  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f), isImg: f.type.startsWith("image/") })),
    [files],
  );

  const t = task as
    | (null
        | (OrderTask & {
            orders?: { id: string; status: string; notes: string | null; scheduled_for: string | null } | null;
          }))
    | undefined;

  const updateStatus = useMutation({
    mutationFn: async (status: OrderTask["status"]) => {
      const { error } = await sb.from("order_tasks").update({ status }).eq("id", taskId);
      if (error) throw error;

      // When marking done, check if all tasks for this order are done.
      // If so, notify the business owner so they can move the order to "ready".
      if (status === "done" && t) {
        const allTasks = await fetchOrderTasksForOrder(t.order_id);
        const remaining = allTasks.filter((x) => x.id !== taskId && x.status !== "done");
        if (remaining.length === 0) {
          const { data: biz } = await supabase
            .from("businesses")
            .select("owner_id, name")
            .eq("id", t.business_id)
            .maybeSingle();
          if (biz?.owner_id) {
            await supabase.from("notifications").insert({
              user_id: biz.owner_id,
              type: "tasks_complete",
              title: "All crew tasks completed",
              body: `Order #${t.order_id.slice(0, 8)} is ready to be marked as ready for the customer.`,
              link: `/business/orders/${t.order_id}`,
            });
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crew-task", taskId] });
      qc.invalidateQueries({ queryKey: ["crew-tasks"] });
      toast({ title: "Task updated" });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const post = async () => {
    if (!user || !t) return;
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const f of files) paths.push(await uploadOrderMedia(t.order_id, f));
      const { error } = await sb.from("order_progress").insert({
        order_id: t.order_id,
        business_id: t.business_id,
        task_id: t.id,
        author_id: user.id,
        note: note || null,
        media_urls: paths,
        stage: "in_progress",
      });
      if (error) throw error;
      setNote("");
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["task-progress", taskId] });
      toast({ title: "Update sent", description: "The customer and provider can see this." });
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <CrewLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </CrewLayout>
    );
  }

  if (!t) {
    return (
      <CrewLayout>
        <PageHeader title="Task not found" description="This task may have been reassigned." />
        <Button asChild variant="secondary">
          <Link to="/crew/tasks">
            <ArrowLeft className="h-4 w-4" /> Back to my tasks
          </Link>
        </Button>
      </CrewLayout>
    );
  }

  return (
    <CrewLayout>
      <Link to="/crew/tasks" className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All tasks
      </Link>

      <Card className="rounded-3xl border-0 shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Order #{t.order_id.slice(0, 8)}</p>
              <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">{t.title}</h1>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider", STATUS_TONE[t.status])}>
              {t.status === "done" ? "Done" : t.status === "in_progress" ? "In progress" : "Pending"}
            </span>
          </div>

          {t.due_at ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
              <Clock className="h-3 w-3" /> Due {new Date(t.due_at).toLocaleString("en-GB")}
            </p>
          ) : null}

          {t.instructions ? (
            <div className="rounded-2xl bg-muted p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instructions</p>
              <p className="mt-1 text-sm">{t.instructions}</p>
            </div>
          ) : null}

          {t.orders?.notes ? (
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer note</p>
              <p className="mt-1 text-sm">{t.orders.notes}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() => updateStatus.mutate("in_progress")}
              disabled={updateStatus.isPending || t.status === "in_progress"}
            >
              Mark in progress
            </Button>
            <Button
              variant="secondary"
              onClick={() => updateStatus.mutate("done")}
              disabled={updateStatus.isPending || t.status === "done"}
            >
              <CheckCircle2 className="h-4 w-4" /> Mark done
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 rounded-3xl border-0 shadow-card">
        <CardContent className="space-y-3 p-5">
          <h2 className="font-display text-lg font-bold">Send progress update</h2>
          <p className="text-xs text-muted-foreground">
            Notes and media you post here go to the customer's order timeline and the provider.
          </p>
          <Textarea
            placeholder="Quick note for the provider and customer…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm font-semibold hover:bg-muted">
            <UploadCloud className="h-4 w-4" /> Upload proof photos / video
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="sr-only"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))}
            />
          </label>
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((f, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl bg-muted">
                  {f.isImg ? (
                    <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">video</div>
                  )}
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
          <Button onClick={post} disabled={uploading || (!note && files.length === 0)}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send update"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4 rounded-3xl border-0 shadow-card">
        <CardContent className="space-y-3 p-5">
          <h2 className="font-display text-lg font-bold">Your updates</h2>
          {progress.length === 0 ? (
            <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">No updates posted yet.</p>
          ) : (
            <ul className="space-y-3">
              {progress.map((p) => (
                <li key={p.id} className="rounded-2xl border border-border p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("en-GB")}
                  </p>
                  {p.note ? <p className="mt-1 text-sm">{p.note}</p> : null}
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
    </CrewLayout>
  );
};

export { CrewTaskDetailPage };
export default CrewTaskDetailPage;

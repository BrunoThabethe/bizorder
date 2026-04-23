import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, UploadCloud, X } from "lucide-react";
import { CrewLayout } from "@/components/crew/CrewLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCrewTasks,
  fetchMyCrewRow,
  uploadOrderMedia,
  type OrderTask,
} from "@/lib/business/queries";
import { cn } from "@/lib/utils";

type TaskRow = OrderTask & {
  orders?: { id: string; status: string; total: number; currency: string; scheduled_for: string | null } | null;
};

const CrewDashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: crewRow } = useQuery({
    queryKey: ["my-crew-row", user?.id],
    queryFn: () => fetchMyCrewRow(user!.id),
    enabled: !!user?.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["crew-tasks", crewRow?.id],
    queryFn: () => fetchCrewTasks(crewRow!.id),
    enabled: !!crewRow?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderTask["status"] }) => {
      const { error } = await sb.from("order_tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crew-tasks", crewRow?.id] });
      toast({ title: "Task updated" });
    },
  });

  return (
    <CrewLayout>
      <PageHeader
        eyebrow={crewRow?.role_title ?? "Crew"}
        title={`Hi ${crewRow?.display_name ?? ""}`}
        description="Here are the jobs assigned to you. Update progress and upload proof."
      />
      {tasks.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No assigned jobs yet. Your provider will assign tasks to you here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((row) => (
            <CrewTaskCard
              key={(row as TaskRow).id}
              task={row as TaskRow}
              onStatus={(s) => updateStatus.mutate({ id: (row as TaskRow).id, status: s })}
              busy={updateStatus.isPending}
            />
          ))}
        </div>
      )}
    </CrewLayout>
  );
};

const CrewTaskCard = ({
  task,
  onStatus,
  busy,
}: {
  task: TaskRow;
  onStatus: (s: OrderTask["status"]) => void;
  busy: boolean;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f), isImg: f.type.startsWith("image/") })),
    [files],
  );

  const post = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadOrderMedia(user.id, f));
      const { error } = await sb.from("order_progress").insert({
        order_id: task.order_id,
        business_id: task.business_id,
        task_id: task.id,
        author_id: user.id,
        note: note || null,
        media_urls: urls,
        stage: "in_progress",
      });
      if (error) throw error;
      setNote("");
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["crew-tasks", task.crew_member_id] });
      toast({ title: "Update sent" });
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="rounded-3xl border-0 shadow-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold">{task.title}</p>
            <p className="text-xs text-muted-foreground">Order #{task.order_id.slice(0, 8)}</p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              task.status === "done"
                ? "bg-foreground text-background"
                : task.status === "in_progress"
                  ? "bg-foreground/20 text-foreground"
                  : "bg-muted text-foreground",
            )}
          >
            {task.status === "done" ? "Done" : task.status === "in_progress" ? "In progress" : "Pending"}
          </span>
        </div>
        {task.instructions ? <p className="rounded-2xl bg-muted p-3 text-sm">{task.instructions}</p> : null}
        {task.due_at ? (
          <p className="text-xs text-muted-foreground">Due {new Date(task.due_at).toLocaleString("en-ZA")}</p>
        ) : null}

        <div className="grid gap-2">
          <Textarea
            placeholder="Quick note for the provider…"
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
          <div className="flex flex-wrap gap-2">
            <Button onClick={post} disabled={uploading || (!note && files.length === 0)}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send update"}
            </Button>
            <Button variant="secondary" onClick={() => onStatus("in_progress")} disabled={busy || task.status === "in_progress"}>
              Mark in progress
            </Button>
            <Button variant="secondary" onClick={() => onStatus("done")} disabled={busy || task.status === "done"}>
              <CheckCircle2 className="h-4 w-4" /> Mark done
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { CrewDashboardPage };
export default CrewDashboardPage;

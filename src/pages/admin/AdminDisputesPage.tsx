import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchAllDisputes, updateDisputeStatus, type Dispute } from "@/lib/admin/queries";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const TONE: Record<string, string> = {
  open: "bg-destructive/15 text-destructive",
  reviewing: "bg-foreground/15 text-foreground",
  resolved: "bg-foreground text-background",
  rejected: "bg-muted text-muted-foreground",
};

const AdminDisputesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const { data, isLoading } = useQuery({ queryKey: ["admin", "disputes"], queryFn: fetchAllDisputes });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; status: Dispute["status"]; resolution: string | null }) =>
      updateDisputeStatus(input.id, input.status, user!.id, input.resolution),
    onSuccess: () => {
      toast({ title: "Dispute updated" });
      queryClient.invalidateQueries({ queryKey: ["admin", "disputes"] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Disputes & complaints</h1>
          <p className="mt-1 text-sm text-muted-foreground">Resolve issues raised by customers and providers.</p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No disputes opened yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {(data ?? []).map((d) => (
              <Card key={d.id} className="rounded-3xl border-0 shadow-card">
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={`${TONE[d.status]} border-0`}>{d.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Order <span className="font-mono">{d.order_id.slice(0, 8)}…</span> ·{" "}
                      Opened {new Date(d.created_at).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{d.reason}</p>
                    {d.details && <p className="mt-1 text-sm text-muted-foreground">{d.details}</p>}
                  </div>

                  {(d.status === "open" || d.status === "reviewing") && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Resolution notes (visible to admins)…"
                        value={resolutions[d.id] ?? ""}
                        onChange={(e) => setResolutions((s) => ({ ...s, [d.id]: e.target.value }))}
                        className="rounded-2xl"
                      />
                      <div className="flex flex-wrap gap-2">
                        {d.status === "open" && (
                          <Button
                            variant="secondary"
                            onClick={() => updateMutation.mutate({ id: d.id, status: "reviewing", resolution: null })}
                          >
                            Mark as reviewing
                          </Button>
                        )}
                        <Button
                          onClick={() =>
                            updateMutation.mutate({
                              id: d.id,
                              status: "resolved",
                              resolution: resolutions[d.id] ?? null,
                            })
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" /> Resolve
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            updateMutation.mutate({
                              id: d.id,
                              status: "rejected",
                              resolution: resolutions[d.id] ?? null,
                            })
                          }
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {d.resolution && (
                    <p className="rounded-2xl bg-muted p-3 text-sm">
                      <span className="font-semibold">Resolution: </span>
                      {d.resolution}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDisputesPage;

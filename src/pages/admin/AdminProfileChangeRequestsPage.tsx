import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sb, type ProfileChangeRequest } from "@/lib/business/queries";

type RequestRow = ProfileChangeRequest & { businesses?: { name: string | null } | null };

const fetchAllRequests = async () => {
  const { data, error } = await sb
    .from("profile_change_requests")
    .select("*, businesses(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RequestRow[];
};

const STATUS_TONE: Record<ProfileChangeRequest["status"], string> = {
  pending: "bg-foreground text-background",
  approved: "bg-foreground/15 text-foreground",
  denied: "bg-destructive/15 text-destructive",
};

const AdminProfileChangeRequestsPage = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-change-requests"],
    queryFn: fetchAllRequests,
  });

  const [dialog, setDialog] = useState<{ id: string; approve: boolean } | null>(null);
  const [reason, setReason] = useState("");

  const resolve = useMutation({
    mutationFn: async () => {
      if (!dialog) return;
      const { error } = await supabase.rpc("admin_resolve_change_request" as never, {
        _request_id: dialog.id,
        _approve: dialog.approve,
        _decision_reason: reason.trim() || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: dialog?.approve ? "Approved" : "Denied" });
      setDialog(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin-change-requests"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Profile changes"
        title="Business change requests"
        description="Approve or deny requests to change a business's name, phone, or email."
      />

      <Card className="rounded-3xl border-0 shadow-card">
        <CardContent className="p-5">
          {isLoading ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <p className="rounded-2xl bg-muted p-8 text-center text-sm text-muted-foreground">
              No change requests yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {requests.map((r) => (
                <li key={r.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{r.businesses?.name ?? "Unknown business"}</p>
                      <Badge className={STATUS_TONE[r.status]}>{r.status}</Badge>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {r.field}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      <span className="text-muted-foreground line-through">{r.current_value || "—"}</span>{" "}
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="font-semibold">{r.requested_value}</span>
                    </p>
                    {r.reason ? <p className="mt-1 text-xs text-muted-foreground">Reason: {r.reason}</p> : null}
                    {r.decision_reason ? (
                      <p className="mt-1 text-xs text-muted-foreground">Admin note: {r.decision_reason}</p>
                    ) : null}
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2 md:justify-end">
                      <Button variant="secondary" onClick={() => setDialog({ id: r.id, approve: false })}>
                        <X className="h-4 w-4" /> Deny
                      </Button>
                      <Button onClick={() => setDialog({ id: r.id, approve: true })}>
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.approve ? "Approve change" : "Deny change"}</DialogTitle>
            <DialogDescription>
              {dialog?.approve
                ? "The change will be applied immediately and the business owner will be notified."
                : "Add a brief note so the business owner understands why."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => resolve.mutate()} disabled={resolve.isPending}>
              {resolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : dialog?.approve ? "Approve" : "Deny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export { AdminProfileChangeRequestsPage };
export default AdminProfileChangeRequestsPage;

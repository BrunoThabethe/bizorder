import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Check, Loader2, User, X } from "lucide-react";
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

type RequestRow = ProfileChangeRequest & {
  businesses?: { name: string | null } | null;
  target_user_id?: string | null;
  submitter?: { full_name: string | null; email: string | null } | null;
};

const fetchAllRequests = async (): Promise<RequestRow[]> => {
  const { data, error } = await sb
    .from("profile_change_requests")
    .select("*, businesses(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as RequestRow[];

  // Hydrate submitter profile for user-scoped requests
  const userIds = Array.from(
    new Set(
      rows
        .filter((r) => !r.business_id)
        .map((r) => r.target_user_id ?? r.submitted_by)
        .filter((v): v is string => !!v),
    ),
  );
  if (userIds.length === 0) return rows;

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => {
    const key = r.target_user_id ?? r.submitted_by;
    const p = key ? byId.get(key) : undefined;
    return { ...r, submitter: p ? { full_name: p.full_name, email: p.email } : null };
  });
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
      qc.invalidateQueries({ queryKey: ["admin-change-requests-count"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Profile changes"
        title="Change requests"
        description="Customers and providers ask to change their name, email, or phone. Approve or deny with a note."
      />

      <Card className="rounded-3xl border-0 shadow-card">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{pendingCount} pending · {requests.length} total</p>
          </div>
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
              {requests.map((r) => {
                const isBusiness = !!r.business_id;
                const who = isBusiness
                  ? r.businesses?.name ?? "Unknown business"
                  : r.submitter?.full_name || r.submitter?.email || "Unknown user";
                return (
                  <li key={r.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                          {isBusiness ? <Briefcase className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                        </span>
                        <p className="truncate font-semibold">{who}</p>
                        <Badge className={STATUS_TONE[r.status]}>{r.status}</Badge>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {isBusiness ? "Business" : "Customer"} · {r.field}
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
                );
              })}
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
                ? "The change will be applied immediately and the requester will be notified."
                : "Add a brief note so the requester understands why."}
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

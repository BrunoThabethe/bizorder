import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchVerificationRequests, logAdminAction, reviewVerification } from "@/lib/admin/queries";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const TONE: Record<string, string> = {
  pending: "bg-foreground/15 text-foreground",
  approved: "bg-foreground text-background",
  rejected: "bg-destructive/15 text-destructive",
};

const AdminVerificationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "verifications"], queryFn: fetchVerificationRequests });

  const reviewMutation = useMutation({
    mutationFn: async (input: { id: string; status: "approved" | "rejected" }) => {
      await reviewVerification(input.id, input.status, user!.id, null);
      await logAdminAction(
        user!.id,
        `verification.${input.status}`,
        "verification_request",
        input.id,
        { status: input.status },
        input.status === "rejected" ? "warning" : "info",
      );
    },
    onSuccess: () => {
      toast({ title: "Decision recorded" });
      queryClient.invalidateQueries({ queryKey: ["admin", "verifications"] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Verification center</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review business identity submissions and proof documents.</p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No verification requests yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {(data ?? []).map((v) => (
              <Card key={v.id} className="rounded-3xl border-0 shadow-card">
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`${TONE[v.status]} border-0`}>{v.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Submitted {new Date(v.created_at).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold">Business:</span> <span className="font-mono text-xs">{v.business_id.slice(0, 8)}…</span>
                    </p>
                    {v.notes && <p className="text-sm text-muted-foreground">{v.notes}</p>}
                    {v.document_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {v.document_urls.map((url, i) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-muted px-3 py-1 text-xs font-semibold hover:bg-muted/70"
                          >
                            Document {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                    {v.decision_reason && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Decision:</span> {v.decision_reason}
                      </p>
                    )}
                  </div>
                  {v.status === "pending" && (
                    <div className="flex gap-2">
                      <Button onClick={() => reviewMutation.mutate({ id: v.id, status: "approved" })}>
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                      <Button variant="secondary" onClick={() => reviewMutation.mutate({ id: v.id, status: "rejected" })}>
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </div>
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

export default AdminVerificationPage;

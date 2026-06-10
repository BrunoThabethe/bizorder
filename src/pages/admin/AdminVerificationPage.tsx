import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, FileText, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchAdminOnboardingSubmissions,
  fetchVerificationRequests,
  logAdminAction,
  reviewOnboardingDocument,
  reviewVerification,
} from "@/lib/admin/queries";
import { DOCUMENT_LABELS, type DocumentType } from "@/lib/business/onboarding";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const STATUS_TONE: Record<string, string> = {
  pending: "bg-foreground/15 text-foreground",
  approved: "bg-foreground text-background",
  rejected: "bg-destructive/15 text-destructive",
};

const AdminVerificationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ["admin", "onboarding-submissions"],
    queryFn: fetchAdminOnboardingSubmissions,
  });

  const { data: legacy = [], isLoading: loadingLegacy } = useQuery({
    queryKey: ["admin", "verifications"],
    queryFn: fetchVerificationRequests,
  });

  const docMutation = useMutation({
    mutationFn: async (input: { id: string; status: "approved" | "rejected" }) => {
      await reviewOnboardingDocument(input.id, input.status, null);
      if (user) {
        await logAdminAction(
          user.id,
          `onboarding_document.${input.status}`,
          "onboarding_document",
          input.id,
          { status: input.status },
          input.status === "rejected" ? "warning" : "info",
        );
      }
    },
    onSuccess: () => {
      toast({ title: "Document reviewed" });
      queryClient.invalidateQueries({ queryKey: ["admin", "onboarding-submissions"] });
    },
  });

  const legacyMutation = useMutation({
    mutationFn: async (input: { id: string; status: "approved" | "rejected" }) => {
      await reviewVerification(input.id, input.status, user!.id, null);
    },
    onSuccess: () => {
      toast({ title: "Decision recorded" });
      queryClient.invalidateQueries({ queryKey: ["admin", "verifications"] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Verification center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review business onboarding documents — owner ID, proof of residence, proof of operations, and CIPC registration.
          </p>
        </div>

        {/* Onboarding submissions */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">Business onboarding submissions</h2>

          {loadingSubs ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <Card className="rounded-3xl border-0 shadow-card">
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No onboarding submissions yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {submissions.map((sub) => (
                <Card key={sub.business.id} className="rounded-3xl border-0 shadow-card">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg font-bold">{sub.business.name}</h3>
                          {sub.business.is_verified && (
                            <Badge className="border-0 bg-foreground text-background">
                              <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {sub.business.trading_address ?? "No trading address"}
                          {sub.business.registration_number && (
                            <> · CIPC {sub.business.registration_number}</>
                          )}
                        </p>
                        {sub.business.website_url && /^https?:\/\//i.test(sub.business.website_url) && (
                          <a
                            href={sub.business.website_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-foreground underline-offset-4 hover:underline"
                          >
                            {sub.business.website_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <Badge variant="secondary" className="border-0">
                        {sub.documents.length} document{sub.documents.length === 1 ? "" : "s"}
                      </Badge>
                    </div>

                    <ul className="grid gap-3 sm:grid-cols-2">
                      {sub.documents.map((doc) => {
                        const meta = DOCUMENT_LABELS[doc.document_type as DocumentType];
                        return (
                          <li key={doc.id} className="rounded-2xl border border-border bg-muted/20 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <p className="truncate text-sm font-semibold">{meta?.title ?? doc.document_type}</p>
                                </div>
                                {doc.file_name && (
                                  <p className="mt-1 truncate text-xs text-muted-foreground">{doc.file_name}</p>
                                )}
                                <Badge className={`mt-2 border-0 ${STATUS_TONE[doc.review_status]}`}>{doc.review_status}</Badge>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {doc.signed_url && (
                                <a
                                  href={doc.signed_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-8 items-center gap-1 rounded-md bg-foreground px-3 text-xs font-semibold text-background hover:bg-foreground/90"
                                >
                                  View <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              {doc.review_status !== "approved" && (
                                <Button
                                  size="sm"
                                  className="h-8"
                                  onClick={() => docMutation.mutate({ id: doc.id, status: "approved" })}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                </Button>
                              )}
                              {doc.review_status !== "rejected" && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8"
                                  onClick={() => docMutation.mutate({ id: doc.id, status: "rejected" })}
                                >
                                  <XCircle className="h-3.5 w-3.5" /> Reject
                                </Button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Legacy verification requests */}
        {!loadingLegacy && legacy.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Legacy verification requests</h2>
            <div className="grid gap-4">
              {legacy.map((v) => (
                <Card key={v.id} className="rounded-3xl border-0 shadow-card">
                  <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${STATUS_TONE[v.status]} border-0`}>{v.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Submitted {new Date(v.created_at).toLocaleDateString("en-GB")}
                        </span>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">Business:</span>{" "}
                        <span className="font-mono text-xs">{v.business_id.slice(0, 8)}…</span>
                      </p>
                      {v.notes && <p className="text-sm text-muted-foreground">{v.notes}</p>}
                    </div>
                    {v.status === "pending" && (
                      <div className="flex gap-2">
                        <Button onClick={() => legacyMutation.mutate({ id: v.id, status: "approved" })}>
                          <CheckCircle2 className="h-4 w-4" /> Approve
                        </Button>
                        <Button variant="secondary" onClick={() => legacyMutation.mutate({ id: v.id, status: "rejected" })}>
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminVerificationPage;

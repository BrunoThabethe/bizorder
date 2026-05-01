import { type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyBusiness } from "@/lib/business/queries";
import {
  DOCUMENT_LABELS,
  REQUIRED_DOCUMENT_TYPES,
  fetchOnboardingDocuments,
  type DocumentType,
} from "@/lib/business/onboarding";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; onSignOut?: () => void | Promise<void> };

const REQUIRED: DocumentType[] = REQUIRED_DOCUMENT_TYPES;

export const OnboardingGate = ({ children, onSignOut }: Props) => {
  const { user, role } = useAuth();
  const location = useLocation();

  const { data: business, isLoading: loadingBiz } = useQuery({
    queryKey: ["my-business", user?.id],
    queryFn: () => fetchMyBusiness(user!.id),
    enabled: !!user && role === "business",
  });

  const businessId = business?.id ?? null;

  const { data: docs = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["onboarding-docs", businessId],
    queryFn: () => fetchOnboardingDocuments(businessId!),
    enabled: !!businessId,
  });

  // Don't gate the onboarding page itself
  const onOnboardingRoute = location.pathname.startsWith("/business/onboarding");
  if (onOnboardingRoute) return <>{children}</>;

  if (role !== "business") return <>{children}</>;
  if (loadingBiz || (businessId && loadingDocs)) return <>{children}</>;
  if (!business) return <>{children}</>;

  const uploadedTypes = new Set(docs.map((d) => d.document_type));
  const missing = REQUIRED.filter((t) => !uploadedTypes.has(t));
  const allUploaded = missing.length === 0;

  // Admin approval = every required doc has review_status === 'approved'
  const requiredDocs = docs.filter((d) => REQUIRED.includes(d.document_type as DocumentType));
  const allApproved =
    allUploaded && requiredDocs.length >= REQUIRED.length &&
    REQUIRED.every((t) => requiredDocs.find((d) => d.document_type === t)?.review_status === "approved");

  const isFullyVerified = business.is_onboarded && allApproved;
  if (isFullyVerified) return <>{children}</>;

  const submittedPendingReview = business.is_onboarded && allUploaded && !allApproved;

  return (
    <>
      <div aria-hidden className="pointer-events-none">{children}</div>
      <div className="fixed inset-0 z-[60] grid place-items-center bg-background/85 px-4 backdrop-blur-md">
        <div className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-card-lift sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-foreground text-background">
              {submittedPendingReview ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </span>
            <div>
              <h2 className="font-display text-xl font-bold leading-tight">
                {submittedPendingReview ? "Awaiting admin approval" : "Finish your verification"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {submittedPendingReview
                  ? "An admin is reviewing your documents. You'll get full access once approved."
                  : "Upload the required documents to start using your provider portal."}
              </p>
            </div>
          </div>

          <ul className="mt-6 space-y-2.5">
            {REQUIRED.map((type) => {
              const doc = docs.find((d) => d.document_type === type);
              const uploaded = !!doc;
              const approved = doc?.review_status === "approved";
              const rejected = doc?.review_status === "rejected";
              return (
                <li
                  key={type}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-3"
                >
                  {approved ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-foreground" />
                  ) : uploaded ? (
                    <Loader2 className={`mt-0.5 h-5 w-5 ${rejected ? "" : "animate-spin"} text-muted-foreground`} />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{DOCUMENT_LABELS[type].title}</p>
                    <p className="text-xs text-muted-foreground">
                      {approved
                        ? "Approved"
                        : rejected
                        ? `Rejected — ${doc?.reviewer_notes ?? "please re-upload"}`
                        : uploaded
                        ? "Uploaded — waiting for admin review"
                        : "Not uploaded yet"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              You can sign out, but this step will be required again next time you sign in.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {onSignOut && (
                <Button variant="secondary" size="lg" onClick={() => void onSignOut()}>
                  Sign out
                </Button>
              )}
              <Button asChild size="lg">
                <Link to="/business/onboarding">
                  {submittedPendingReview ? "View submission" : "Continue verification"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

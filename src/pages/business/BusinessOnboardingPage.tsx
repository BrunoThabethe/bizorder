import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Globe, Loader2, LogOut, MapPin, ShieldCheck, Upload, Zap } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrCreateMyBusiness } from "@/lib/business/queries";
import {
  DOCUMENT_LABELS,
  REQUIRED_DOCUMENT_TYPES,
  type DocumentType,
  fetchOnboardingDocuments,
  markBusinessOnboarded,
  updateBusinessVerificationFields,
  uploadVerificationDocument,
  verificationDocAccept,
} from "@/lib/business/onboarding";

const detailsSchema = z.object({
  trading_address: z.string().trim().min(5, "Address is too short").max(300),
  registration_number: z.string().trim().max(50).optional().or(z.literal("")),
  website_url: z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), "Use a valid URL starting with http(s)://")
    .optional()
    .or(z.literal("")),
});

const ALL_DOC_TYPES: DocumentType[] = [
  "owner_id",
  "proof_of_residence",
  "proof_of_operations",
  "cipc_registration",
];

export const BusinessOnboardingPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: business, isLoading } = useQuery({
    queryKey: ["my-business", user?.id],
    queryFn: () => fetchOrCreateMyBusiness(user!),
    enabled: !authLoading && !!user,
  });

  const businessId = business?.id ?? null;

  const { data: docs = [] } = useQuery({
    queryKey: ["onboarding-docs", businessId],
    queryFn: () => fetchOnboardingDocuments(businessId!),
    enabled: !!businessId,
  });

  const [tradingAddress, setTradingAddress] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
    navigate("/login");
  };

  useEffect(() => {
    if (!business) return;
    setTradingAddress(business.trading_address ?? "");
    setRegistrationNumber(business.registration_number ?? "");
    setWebsiteUrl(business.website_url ?? "");
  }, [business]);

  const docByType = useMemo(() => {
    const map: Partial<Record<DocumentType, (typeof docs)[number]>> = {};
    docs.forEach((d) => {
      if (!map[d.document_type]) map[d.document_type] = d;
    });
    return map;
  }, [docs]);

  const requiredDone = REQUIRED_DOCUMENT_TYPES.every((t) => !!docByType[t]);
  const detailsDone = tradingAddress.trim().length >= 5;
  const canFinish = requiredDone && detailsDone && !!business?.trading_address;

  const uploadMutation = useMutation({
    mutationFn: async (input: { type: DocumentType; file: File }) => {
      if (!businessId || authLoading) throw new Error("Please wait while we confirm your session.");
      return uploadVerificationDocument(businessId, user?.id ?? null, input.type, input.file);
    },
    onSuccess: () => {
      toast({ title: "Document uploaded" });
      queryClient.invalidateQueries({ queryKey: ["onboarding-docs", businessId] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    },
    onSettled: () => setUploadingType(null),
  });

  const handleFile = (type: DocumentType) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingType(type);
    uploadMutation.mutate({ type, file });
  };

  const onSaveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!businessId) return;
    const parsed = detailsSchema.safeParse({
      trading_address: tradingAddress,
      registration_number: registrationNumber,
      website_url: websiteUrl,
    });
    if (!parsed.success) {
      toast({
        title: "Check your details",
        description: parsed.error.issues[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }
    setSavingDetails(true);
    try {
      await updateBusinessVerificationFields(businessId, {
        trading_address: parsed.data.trading_address,
        registration_number: parsed.data.registration_number || null,
        website_url: parsed.data.website_url || null,
      });
      toast({ title: "Details saved" });
      queryClient.invalidateQueries({ queryKey: ["my-business", user?.id] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSavingDetails(false);
    }
  };

  const finishMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("No business");
      await markBusinessOnboarded(businessId);
    },
    onSuccess: () => {
      toast({ title: "Onboarding complete", description: "Admins will review your documents shortly." });
      navigate("/business");
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background">
              <Zap className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-bold">BizOrder</span>
          </div>
          <Button variant="secondary" onClick={() => void onSignOut()}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Complete your business verification"
        description="Upload the required documents and confirm your trading details. We keep these private — only you and the admin team can see them."
      />

      <div className="space-y-6">
        {business?.is_onboarded && (
          <Card className="rounded-3xl border-0 bg-foreground/5 shadow-card">
            <CardContent className="flex items-center gap-3 p-5">
              <ShieldCheck className="h-5 w-5 text-foreground" />
              <p className="text-sm">
                Documents submitted. An admin will confirm your verification shortly. You can replace any document below if needed.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Trading details */}
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/10">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">Trading details</h2>
                <p className="text-sm text-muted-foreground">Where you operate from. Used for verification only.</p>
              </div>
            </div>

            <form onSubmit={onSaveDetails} className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="trading_address">Business address</Label>
                <Input
                  id="trading_address"
                  value={tradingAddress}
                  onChange={(e) => setTradingAddress(e.target.value)}
                  placeholder="12 Vilakazi Street, Soweto, Johannesburg"
                  maxLength={300}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="registration_number">CIPC registration number (optional)</Label>
                  <Input
                    id="registration_number"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="2023/123456/07"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website_url" className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5" /> Website or social link (optional)
                  </Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.co.za"
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={savingDetails}>
                  {savingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save details"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/10">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">Verification documents</h2>
                <p className="text-sm text-muted-foreground">JPG, PNG, WebP, or PDF — up to 10 MB each.</p>
              </div>
            </div>

            <ul className="space-y-3">
              {ALL_DOC_TYPES.map((type) => {
                const meta = DOCUMENT_LABELS[type];
                const existing = docByType[type];
                const isUploading = uploadingType === type && uploadMutation.isPending;
                return (
                  <li key={type} className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{meta.title}</p>
                          {meta.required ? (
                            <Badge className="border-0 bg-foreground text-background">Required</Badge>
                          ) : (
                            <Badge variant="secondary" className="border-0">Optional</Badge>
                          )}
                          {existing && (
                            <Badge className="border-0 bg-foreground/10 text-foreground">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Uploaded
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{meta.helper}</p>
                        {existing?.file_name && (
                          <p className="mt-2 truncate text-xs text-muted-foreground">
                            File: <span className="text-foreground">{existing.file_name}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="inline-flex">
                          <input
                            type="file"
                            accept={verificationDocAccept}
                            className="hidden"
                            onChange={handleFile(type)}
                            disabled={isUploading}
                          />
                          <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90">
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {existing ? "Replace" : "Upload"}
                          </span>
                        </label>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {requiredDone
              ? "All required documents uploaded."
              : "Upload all required documents to continue."}
          </p>
          <Button
            size="lg"
            disabled={!canFinish || finishMutation.isPending}
            onClick={() => finishMutation.mutate()}
          >
            {finishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for review"}
          </Button>
        </div>
      </div>
      </main>
    </div>
  );
};

export default BusinessOnboardingPage;

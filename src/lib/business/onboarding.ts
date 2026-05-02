import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/business/queries";

export type DocumentType =
  | "owner_id"
  | "proof_of_residence"
  | "proof_of_operations"
  | "cipc_registration";

export type OnboardingDocument = {
  id: string;
  business_id: string;
  document_type: DocumentType;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string;
  review_status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  "owner_id",
  "proof_of_residence",
  "proof_of_operations",
];

export const DOCUMENT_LABELS: Record<DocumentType, { title: string; helper: string; required: boolean }> = {
  owner_id: {
    title: "Owner ID",
    helper: "South African ID or passport (clear photo or scan).",
    required: true,
  },
  proof_of_residence: {
    title: "Proof of residence",
    helper: "Utility bill, bank letter, or lease — not older than 3 months.",
    required: true,
  },
  proof_of_operations: {
    title: "Proof of operations",
    helper: "Photo of premises, signage, branded vehicle, or recent invoice.",
    required: true,
  },
  cipc_registration: {
    title: "CIPC registration (optional)",
    helper: "Upload your CIPC certificate if your business is formally registered.",
    required: false,
  },
};

export const verificationDocAccept = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

export const uploadVerificationDocument = async (
  businessId: string,
  userId: string | null,
  type: DocumentType,
  file: File,
): Promise<OnboardingDocument> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Please stay signed in to upload verification documents.");

  const uploadedBy = userId ?? authData.user.id;

  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
    throw new Error("Use JPG, PNG, WebP, or PDF files only.");
  }
  if (file.size > MAX_BYTES) throw new Error("File must be smaller than 10 MB.");

  const extRaw = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const ext = ["jpg", "jpeg", "png", "webp", "pdf"].includes(extRaw) ? extRaw : "bin";
  const path = `${businessId}/${type}-${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("verification-docs")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;

  // Save the document record via a SECURITY DEFINER function so RLS can't
  // block well-formed submissions for the user's own business.
  const { data, error } = await sb.rpc("save_business_onboarding_document", {
    _business_id: businessId,
    _document_type: type,
    _storage_path: path,
    _file_name: file.name,
    _mime_type: file.type,
    _size_bytes: file.size,
  });
  if (error) {
    // Best-effort: clean up the orphaned object so we don't leave junk.
    await supabase.storage.from("verification-docs").remove([path]).catch(() => undefined);
    throw error;
  }
  // Suppress unused warning for uploadedBy — kept for API compatibility.
  void uploadedBy;
  return data as OnboardingDocument;
};

export const fetchOnboardingDocuments = async (businessId: string) => {
  const { data, error } = await sb
    .from("business_onboarding_documents")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OnboardingDocument[];
};

export const signVerificationDocs = async (paths: string[], expires = 600) => {
  if (paths.length === 0) return [] as string[];
  const { data, error } = await supabase.storage
    .from("verification-docs")
    .createSignedUrls(paths, expires);
  if (error) throw error;
  return (data ?? []).map((d) => d.signedUrl);
};

export const markBusinessOnboarded = async (businessId: string) => {
  const { error } = await sb
    .from("businesses")
    .update({ is_onboarded: true })
    .eq("id", businessId);
  if (error) throw error;
};

export const isBusinessFullyVerified = async (businessId: string) => {
  const { data: business, error } = await supabase
    .from("businesses")
    .select("is_onboarded")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;
  if (!business?.is_onboarded) return false;

  const docs = await fetchOnboardingDocuments(businessId);
  return REQUIRED_DOCUMENT_TYPES.every(
    (type) => docs.find((doc) => doc.document_type === type)?.review_status === "approved",
  );
};

export const updateBusinessVerificationFields = async (
  businessId: string,
  patch: { trading_address?: string | null; registration_number?: string | null; website_url?: string | null },
) => {
  const { error } = await sb.from("businesses").update(patch).eq("id", businessId);
  if (error) throw error;
};

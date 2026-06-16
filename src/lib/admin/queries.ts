import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Use a typed accessor for tables not yet in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sb = supabase as any;

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export type VerificationRequest = {
  id: string;
  business_id: string;
  submitted_by: string;
  status: "pending" | "approved" | "rejected";
  document_urls: string[];
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type Dispute = {
  id: string;
  order_id: string;
  opened_by: string;
  business_id: string;
  customer_id: string;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "rejected";
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  full_name: string | null;
  source: string | null;
  is_active: boolean;
  unsubscribed_at: string | null;
  created_at: string;
};

export type AiCampaign = {
  id: string;
  title: string;
  subject: string | null;
  prompt: string | null;
  body: string | null;
  status: "draft" | "scheduled" | "sent" | "archived";
  scheduled_for: string | null;
  sent_at: string | null;
  recipients_count: number;
  opens_count: number;
  clicks_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AiAssistantSettings = {
  id: string;
  is_enabled: boolean;
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  updated_at: string;
};

export type SystemSetting = {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  severity: "info" | "warning" | "critical";
  created_at: string;
};

export type Payout = {
  id: string;
  business_id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: "pending" | "released" | "paid";
  released_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export const formatPrice = (value: number, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

export const formatNumber = (value: number) => new Intl.NumberFormat("en-ZA").format(value);

// ============= Dashboard / Metrics =============
export const fetchAdminMetrics = async () => {
  const [
    { count: totalProfiles },
    { count: totalBusinesses },
    { count: publishedBusinesses },
    { data: roleRows },
    { data: orders },
    { data: payouts },
    { count: openDisputes },
    { count: pendingVerifications },
    { count: subscribers },
    { data: businessesForTop },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }),
    supabase
      .from("businesses")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)
      .is("deleted_at", null),
    supabase.from("user_roles").select("role"),
    supabase.from("orders").select("id, business_id, status, total, created_at"),
    sb.from("payouts").select("amount, status"),
    sb.from("disputes").select("*", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
    sb
      .from("verification_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    sb.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("businesses").select("id, name"),
  ]);

  const ordersList = (orders ?? []) as Array<{
    business_id: string;
    status: OrderStatus;
    total: number;
    created_at: string;
  }>;
  const byStatus = ordersList.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const gmv = ordersList
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const completionRate =
    ordersList.length > 0 ? Math.round(((byStatus.completed ?? 0) / ordersList.length) * 100) : 0;
  const cancellationRate =
    ordersList.length > 0 ? Math.round(((byStatus.cancelled ?? 0) / ordersList.length) * 100) : 0;

  const roles = (roleRows ?? []) as Array<{ role: AppRole }>;
  const roleCounts = roles.reduce<Record<string, number>>((acc, r) => {
    acc[r.role] = (acc[r.role] ?? 0) + 1;
    return acc;
  }, {});

  const payoutsList = (payouts ?? []) as Array<{ amount: number; status: string }>;
  const pendingPayouts = payoutsList
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);

  // Daily orders, last 30 days
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { date: string; created: number; completed: number }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ date: dayKey(d), created: 0, completed: 0 });
  }
  const indexByDate = new Map(days.map((d, i) => [d.date, i]));
  for (const o of ordersList) {
    const k = o.created_at.slice(0, 10);
    const idx = indexByDate.get(k);
    if (idx === undefined) continue;
    days[idx].created += 1;
    if (o.status === "completed") days[idx].completed += 1;
  }

  // Top providers by GMV
  const businessNameById = new Map<string, string>(
    (businessesForTop ?? []).map((b: { id: string; name: string }) => [b.id, b.name]),
  );
  const gmvByBusiness = new Map<string, number>();
  for (const o of ordersList) {
    if (o.status !== "completed") continue;
    gmvByBusiness.set(o.business_id, (gmvByBusiness.get(o.business_id) ?? 0) + Number(o.total ?? 0));
  }
  const topProviders = Array.from(gmvByBusiness.entries())
    .map(([id, total]) => ({ name: businessNameById.get(id) ?? "Unknown", gmv: total }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 5);

  return {
    totalUsers: totalProfiles ?? 0,
    totalBusinesses: totalBusinesses ?? 0,
    publishedBusinesses: publishedBusinesses ?? 0,
    customers: roleCounts.customer ?? 0,
    providers: roleCounts.business ?? 0,
    crew: roleCounts.crew ?? 0,
    admins: roleCounts.admin ?? 0,
    totalOrders: ordersList.length,
    pendingOrders: byStatus.pending ?? 0,
    acceptedOrders: byStatus.accepted ?? 0,
    inProgressOrders: byStatus.in_progress ?? 0,
    completedOrders: byStatus.completed ?? 0,
    cancelledOrders: byStatus.cancelled ?? 0,
    gmv,
    pendingPayouts,
    openDisputes: openDisputes ?? 0,
    pendingVerifications: pendingVerifications ?? 0,
    subscribers: subscribers ?? 0,
    completionRate,
    cancellationRate,
    dailyOrders: days,
    topProviders,
  };
};

export const softDeleteBusiness = async (businessId: string, reason: string) => {
  const { error } = await sb.rpc("admin_soft_delete_business", {
    _business_id: businessId,
    _reason: reason,
  });
  if (error) throw error;
};

export const restoreBusiness = async (businessId: string) => {
  const { error } = await sb.rpc("admin_restore_business", { _business_id: businessId });
  if (error) throw error;
};

export const purgeBusiness = async (businessId: string) => {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; error?: string }>(
    "admin-business-purge",
    { body: { business_id: businessId } },
  );
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? "Purge failed");
};

// ============= Orders =============
export const fetchAllOrders = async () => {
  // Only show orders that have been paid for — drafts in `awaiting_payment` are
  // hidden until TradeSafe confirms funds.
  const { data, error } = await supabase
    .from("orders")
    .select("*, services(title), businesses(name, slug)")
    .neq("status", "awaiting_payment")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const list = data ?? [];
  const customerIds = Array.from(new Set(list.map((o) => o.customer_id)));
  let profiles: Record<string, { full_name: string | null; email: string }> = {};
  if (customerIds.length) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", customerIds);
    profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]));
  }
  return list.map((o) => ({ ...o, profiles: profiles[o.customer_id] ?? null }));
};

// ============= Users / Businesses =============
export const fetchAllProfiles = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const ids = (data ?? []).map((p) => p.id);
  let roles: Record<string, AppRole[]> = {};
  if (ids.length) {
    const { data: roleRows } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
    roles = (roleRows ?? []).reduce<Record<string, AppRole[]>>((acc, r) => {
      acc[r.user_id] = [...(acc[r.user_id] ?? []), r.role];
      return acc;
    }, {});
  }
  return (data ?? []).map((p) => ({ ...p, roles: roles[p.id] ?? [] }));
};

export const fetchAllBusinesses = async () => {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data as Business[];
};

export const setBusinessVerified = async (businessId: string, isVerified: boolean) => {
  const { error } = await sb.rpc("admin_finalize_business_verification", {
    _business_id: businessId,
    _verify: isVerified,
  });
  if (error) throw error;
};

export const setBusinessPublished = async (businessId: string, isPublished: boolean) => {
  const { error } = await supabase.from("businesses").update({ is_published: isPublished }).eq("id", businessId);
  if (error) throw error;
};

// ============= Verification =============
export const fetchVerificationRequests = async () => {
  const { data, error } = await sb
    .from("verification_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VerificationRequest[];
};

export const reviewVerification = async (
  id: string,
  status: "approved" | "rejected",
  reviewerId: string,
  reason: string | null,
) => {
  const { error } = await sb
    .from("verification_requests")
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      decision_reason: reason,
    })
    .eq("id", id);
  if (error) throw error;
};

// ============= Onboarding documents =============
export type AdminOnboardingSubmission = {
  business: Business;
  documents: Array<{
    id: string;
    document_type: "owner_id" | "proof_of_residence" | "proof_of_operations" | "cipc_registration";
    storage_path: string;
    file_name: string | null;
    mime_type: string | null;
    review_status: "pending" | "approved" | "rejected";
    created_at: string;
    signed_url: string | null;
  }>;
};

export const fetchAdminOnboardingSubmissions = async (): Promise<AdminOnboardingSubmission[]> => {
  const { data: businesses, error } = await sb
    .from("businesses")
    .select("*")
    .eq("is_onboarded", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const list = (businesses ?? []) as Business[];
  if (list.length === 0) return [];

  const ids = list.map((b) => b.id);
  const { data: docs, error: docErr } = await sb
    .from("business_onboarding_documents")
    .select("*")
    .in("business_id", ids)
    .order("created_at", { ascending: false });
  if (docErr) throw docErr;

  const allPaths = (docs ?? []).map((d: { storage_path: string }) => d.storage_path);
  let signedByPath: Record<string, string> = {};
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("verification-docs")
      .createSignedUrls(allPaths, 600);
    signedByPath = Object.fromEntries(
      (signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => !!p),
    );
  }

  return list.map((b) => ({
    business: b,
    documents: (docs ?? [])
      .filter((d: { business_id: string }) => d.business_id === b.id)
      .map((d: {
        id: string;
        document_type: AdminOnboardingSubmission["documents"][number]["document_type"];
        storage_path: string;
        file_name: string | null;
        mime_type: string | null;
        review_status: AdminOnboardingSubmission["documents"][number]["review_status"];
        created_at: string;
      }) => ({
        id: d.id,
        document_type: d.document_type,
        storage_path: d.storage_path,
        file_name: d.file_name,
        mime_type: d.mime_type,
        review_status: d.review_status,
        created_at: d.created_at,
        signed_url: signedByPath[d.storage_path] ?? null,
      })),
  }));
};

export const reviewOnboardingDocument = async (
  documentId: string,
  status: "approved" | "rejected",
  notes: string | null,
) => {
  const { error } = await sb
    .from("business_onboarding_documents")
    .update({
      review_status: status,
      reviewer_notes: notes,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", documentId);
  if (error) throw error;
};

// ============= Disputes =============
export const fetchAllDisputes = async () => {
  const { data, error } = await sb.from("disputes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Dispute[];
};

export const updateDisputeStatus = async (
  id: string,
  status: Dispute["status"],
  resolverId: string,
  resolution: string | null,
) => {
  const updates: Record<string, unknown> = { status };
  if (status === "resolved" || status === "rejected") {
    updates.resolved_by = resolverId;
    updates.resolved_at = new Date().toISOString();
    updates.resolution = resolution;
  }
  const { error } = await sb.from("disputes").update(updates).eq("id", id);
  if (error) throw error;
};

// ============= Payouts =============
export const fetchAllPayouts = async () => {
  const { data, error } = await sb.from("payouts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Payout[];
};

export const updatePayoutStatus = async (id: string, status: Payout["status"]) => {
  const updates: Record<string, unknown> = { status };
  if (status === "released") updates.released_at = new Date().toISOString();
  if (status === "paid") updates.paid_at = new Date().toISOString();
  const { error } = await sb.from("payouts").update(updates).eq("id", id);
  if (error) throw error;
};

// ============= Uploads / Proof logs =============
export const fetchProgressLogs = async () => {
  const { data, error } = await sb
    .from("order_progress")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
};

// ============= Newsletter =============
export const fetchSubscribers = async () => {
  const { data, error } = await sb
    .from("newsletter_subscribers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as NewsletterSubscriber[];
};

export const toggleSubscriber = async (id: string, isActive: boolean) => {
  const { error } = await sb
    .from("newsletter_subscribers")
    .update({ is_active: isActive, unsubscribed_at: isActive ? null : new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// ============= AI Campaigns =============
export const fetchCampaigns = async () => {
  const { data, error } = await sb.from("ai_campaigns").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AiCampaign[];
};

export const createCampaign = async (input: {
  title: string;
  subject: string;
  prompt: string;
  body: string;
  status: AiCampaign["status"];
  createdBy: string;
}) => {
  const { error } = await sb.from("ai_campaigns").insert({
    title: input.title,
    subject: input.subject,
    prompt: input.prompt,
    body: input.body,
    status: input.status,
    created_by: input.createdBy,
  });
  if (error) throw error;
};

// ============= AI Assistant Settings =============
export const fetchAiSettings = async () => {
  const { data, error } = await sb
    .from("ai_assistant_settings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as AiAssistantSettings | null;
};

export const upsertAiSettings = async (
  input: Partial<AiAssistantSettings> & { updated_by: string },
  existingId?: string,
) => {
  if (existingId) {
    const { error } = await sb.from("ai_assistant_settings").update(input).eq("id", existingId);
    if (error) throw error;
  } else {
    const { error } = await sb.from("ai_assistant_settings").insert(input);
    if (error) throw error;
  }
};

// ============= System Settings =============
export const fetchSystemSettings = async () => {
  const { data, error } = await sb.from("system_settings").select("*").order("key");
  if (error) throw error;
  return (data ?? []) as SystemSetting[];
};

export const upsertSystemSetting = async (
  key: string,
  value: Record<string, unknown>,
  description: string | null,
  updatedBy: string,
) => {
  const { data: existing } = await sb.from("system_settings").select("id").eq("key", key).maybeSingle();
  if (existing?.id) {
    const { error } = await sb
      .from("system_settings")
      .update({ value, description, updated_by: updatedBy })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from("system_settings").insert({ key, value, description, updated_by: updatedBy });
    if (error) throw error;
  }
};

// ============= Admin order detail =============
export type AdminOrderEvent = {
  id: string;
  order_id: string;
  actor_id: string | null;
  type: string;
  message: string | null;
  created_at: string;
};

export type AdminOrderProgress = {
  id: string;
  order_id: string;
  business_id: string;
  task_id: string | null;
  author_id: string;
  note: string | null;
  media_urls: string[];
  stage: string | null;
  created_at: string;
};

export type AdminOrderMessage = {
  id: string;
  order_id: string;
  sender_id: string;
  body: string;
  attachment_url: string | null;
  read_at: string | null;
  created_at: string;
};

export type AdminOrderTask = {
  id: string;
  order_id: string;
  business_id: string;
  crew_member_id: string | null;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export const fetchAdminOrderDetail = async (orderId: string) => {
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, services(title, description), addresses(*), businesses(id, name, slug, owner_id, phone, email)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  const [
    { data: customer },
    { data: events },
    { data: progress },
    { data: messages },
    { data: tasks },
    { data: dispute },
    { data: payment },
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, avatar_url").eq("id", order.customer_id).maybeSingle(),
    sb.from("order_events").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
    sb.from("order_progress").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
    sb.from("messages").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
    sb.from("order_tasks").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
    sb.from("disputes").select("*").eq("order_id", orderId).maybeSingle(),
    sb.from("order_payments").select("status, funded_at, released_at, refunded_at, last_error").eq("order_id", orderId).maybeSingle(),
  ]);

  // Resolve actor profiles for events, progress and messages.
  const actorIds = new Set<string>();
  (events ?? []).forEach((e: AdminOrderEvent) => e.actor_id && actorIds.add(e.actor_id));
  (progress ?? []).forEach((p: AdminOrderProgress) => p.author_id && actorIds.add(p.author_id));
  (messages ?? []).forEach((m: AdminOrderMessage) => m.sender_id && actorIds.add(m.sender_id));
  if ((order as { businesses?: { owner_id?: string } }).businesses?.owner_id) {
    actorIds.add((order as { businesses: { owner_id: string } }).businesses.owner_id);
  }

  let actors: Record<string, { full_name: string | null; email: string; avatar_url: string | null }> = {};
  if (actorIds.size) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", Array.from(actorIds));
    actors = Object.fromEntries(
      (profs ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url }]),
    );
  }

  return {
    order,
    customer: customer ?? null,
    events: (events ?? []) as AdminOrderEvent[],
    progress: (progress ?? []) as AdminOrderProgress[],
    messages: (messages ?? []) as AdminOrderMessage[],
    tasks: (tasks ?? []) as AdminOrderTask[],
    dispute: (dispute ?? null) as Dispute | null,
    payment: payment ?? null,
    actors,
  };
};

// ============= Trend data for charts =============
export const fetchAdminTrends = async () => {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    .from("orders")
    .select("status, total, created_at")
    .gte("created_at", since.toISOString());

  const days: { date: string; label: string; orders: number; gmv: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    days.push({ date: key, label, orders: 0, gmv: 0 });
  }
  const map = new Map(days.map((d) => [d.date, d]));
  (orders ?? []).forEach((o) => {
    const key = o.created_at.slice(0, 10);
    const day = map.get(key);
    if (!day) return;
    day.orders += 1;
    if (o.status === "completed") day.gmv += Number(o.total ?? 0);
  });
  return days;
};

// ============= Audit Logs =============
export const fetchAuditLogs = async () => {
  const { data, error } = await sb
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as AuditLog[];
};

export const logAdminAction = async (
  actorId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata: Record<string, unknown> = {},
  severity: AuditLog["severity"] = "info",
) => {
  await sb.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata,
    severity,
  });
};

// ============= User detail & deletion =============
export type AdminUserDetail = {
  profile: Profile;
  roles: AppRole[];
  addresses: Array<{ id: string; label: string; recipient: string; line1: string; line2: string | null; city: string; postal_code: string | null; country: string; phone: string | null; is_default: boolean }>;
  ownedBusinesses: Array<{ id: string; name: string; slug: string; is_published: boolean; is_verified: boolean }>;
  orderCount: number;
  lastSignInAt: string | null;
};

export const fetchUserDetail = async (userId: string): Promise<AdminUserDetail | null> => {
  const [{ data: profile }, { data: roleRows }, { data: addresses }, { data: businesses }, { count: orderCount }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("addresses").select("*").eq("user_id", userId),
    supabase.from("businesses").select("id, name, slug, is_published, is_verified").eq("owner_id", userId),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("customer_id", userId),
  ]);
  if (!profile) return null;
  return {
    profile: profile as Profile,
    roles: ((roleRows ?? []) as Array<{ role: AppRole }>).map((r) => r.role),
    addresses: (addresses ?? []) as AdminUserDetail["addresses"],
    ownedBusinesses: (businesses ?? []) as AdminUserDetail["ownedBusinesses"],
    orderCount: orderCount ?? 0,
    lastSignInAt: null,
  };
};

export const adminDeleteUser = async (userId: string) => {
  const { error } = await sb.rpc("admin_delete_user", { _user_id: userId });
  if (error) throw error;
};

// ============= Verification checks =============
export type VerificationStep =
  | "operating_proof"
  | "identity_check"
  | "address_check"
  | "references_check"
  | "online_presence";

export type VerificationCheck = {
  id: string;
  business_id: string;
  step: VerificationStep;
  is_completed: boolean;
  notes: string | null;
  completed_by: string | null;
  completed_at: string | null;
};

export const VERIFICATION_STEPS: Array<{ key: VerificationStep; title: string; description: string }> = [
  {
    key: "operating_proof",
    title: "Proof of operation",
    description: "Photos of the workspace, vehicle branding, signage, tools or product samples that prove the business is actively trading.",
  },
  {
    key: "identity_check",
    title: "Owner ID check",
    description: "South African ID, passport or driver's licence of the owner. Match the name to the profile.",
  },
  {
    key: "address_check",
    title: "Trading address",
    description: "Recent utility bill, lease, municipal letter or a geo-tagged photo of the trading location (within the last 3 months).",
  },
  {
    key: "references_check",
    title: "Customer references",
    description: "Two contactable referees (name + phone) who have used the business in the last 6 months. Call to confirm.",
  },
  {
    key: "online_presence",
    title: "Online & social presence",
    description: "Active WhatsApp Business, Facebook page, Instagram or Google listing with at least 3 months of activity.",
  },
];

export const fetchVerificationChecks = async (businessId: string) => {
  const { data, error } = await sb
    .from("business_verification_checks")
    .select("*")
    .eq("business_id", businessId);
  if (error) throw error;
  return (data ?? []) as VerificationCheck[];
};

export const setVerificationCheck = async (
  businessId: string,
  step: VerificationStep,
  isCompleted: boolean,
  notes: string | null = null,
) => {
  const { error } = await sb.rpc("set_verification_check", {
    _business_id: businessId,
    _step: step,
    _completed: isCompleted,
    _notes: notes,
  });
  if (error) throw error;
};

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
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("user_roles").select("role"),
    supabase.from("orders").select("id, status, total, created_at"),
    sb.from("payouts").select("amount, status"),
    sb.from("disputes").select("*", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
    sb
      .from("verification_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    sb.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const ordersList = (orders ?? []) as Array<{ status: OrderStatus; total: number; created_at: string }>;
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
  };
};

// ============= Orders =============
export const fetchAllOrders = async () => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, services(title), businesses(name, slug)")
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
  const { error } = await supabase.from("businesses").update({ is_verified: isVerified }).eq("id", businessId);
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
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, avatar_url").eq("id", order.customer_id).maybeSingle(),
    sb.from("order_events").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
    sb.from("order_progress").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
    sb.from("messages").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
    sb.from("order_tasks").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
    sb.from("disputes").select("*").eq("order_id", orderId).maybeSingle(),
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

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { User } from "@supabase/supabase-js";

// Tables added in latest migration are not yet in the generated types.
// Use this typed accessor to interact with them safely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sb = supabase as any;

export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderEvent = Database["public"]["Tables"]["order_events"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];

export type CrewMember = {
  id: string;
  business_id: string;
  user_id: string;
  display_name: string;
  role_title: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderTask = {
  id: string;
  order_id: string;
  business_id: string;
  crew_member_id: string | null;
  title: string;
  instructions: string | null;
  status: "pending" | "in_progress" | "done";
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderProgress = {
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
  updated_at: string;
};

export const proofPhotoMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const proofPhotoAccept = proofPhotoMimeTypes.join(",");
const proofPhotoExtensions = ["jpg", "jpeg", "png", "webp"] as const;

export const isProofPhoto = (file: File) => {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  return proofPhotoMimeTypes.includes(file.type as (typeof proofPhotoMimeTypes)[number]) && proofPhotoExtensions.includes(ext as (typeof proofPhotoExtensions)[number]);
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  pending: "New",
  accepted: "Accepted",
  in_progress: "In progress",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  ready_for_review: "Awaiting your confirmation",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<OrderStatus, string> = {
  awaiting_payment: "bg-accent/20 text-foreground",
  pending: "bg-foreground text-background",
  accepted: "bg-foreground/15 text-foreground",
  in_progress: "bg-foreground/85 text-background",
  ready: "bg-foreground/20 text-foreground",
  out_for_delivery: "bg-foreground/30 text-foreground",
  ready_for_review: "bg-foreground text-background",
  completed: "bg-foreground/10 text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

export const formatPrice = (value: number, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 52);

export const fetchMyBusiness = async (userId: string) => {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Business | null;
};

export const fetchOrCreateMyBusiness = async (user: User) => {
  const existing = await fetchMyBusiness(user.id);
  if (existing) return existing;

  const metadata = user.user_metadata ?? {};
  const businessName = typeof metadata.business_name === "string" ? metadata.business_name.trim() : "";
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  const phone = typeof metadata.phone === "string" ? metadata.phone.trim() : null;
  const category = typeof metadata.business_category === "string" ? metadata.business_category.trim() : null;
  const address = typeof metadata.business_address === "string" ? metadata.business_address.trim() : null;
  const name = businessName || fullName || user.email?.split("@")[0] || "New business";
  const slug = `${slugify(name) || "business"}-${user.id.slice(0, 8)}`;

  const { data, error } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      name,
      slug,
      email: user.email ?? null,
      phone,
      category: category || null,
      trading_address: address || null,
      address: address || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Business;
};

export const fetchBusinessOrders = async (businessId: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, services(title)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const orders = data ?? [];
  const customerIds = Array.from(new Set(orders.map((o) => o.customer_id)));
  let profiles: Record<string, { full_name: string | null; email: string }> = {};
  if (customerIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", customerIds);
    profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]));
  }
  return orders.map((o) => ({ ...o, profiles: profiles[o.customer_id] ?? null }));
};

export const fetchBusinessOrderById = async (orderId: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, services(title, description), addresses(*)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", data.customer_id)
    .maybeSingle();
  return { ...data, profiles: prof ?? null };
};

export const fetchBusinessServices = async (businessId: string) => {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Service[];
};

export const fetchBusinessReviews = async (businessId: string) => {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const reviews = data ?? [];
  const customerIds = Array.from(new Set(reviews.map((r) => r.customer_id)));
  let profiles: Record<string, { full_name: string | null }> = {};
  if (customerIds.length) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", customerIds);
    profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, { full_name: p.full_name }]));
  }
  return reviews.map((r) => ({ ...r, profiles: profiles[r.customer_id] ?? null }));
};

export const fetchPayouts = async (businessId: string) => {
  const { data, error } = await supabase
    .from("payouts" as never)
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Payout[];
};

export const fetchCrew = async (businessId: string) => {
  const { data, error } = await supabase
    .from("crew_members" as never)
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CrewMember[];
};

export const fetchOrderTasks = async (orderId: string) => {
  const { data, error } = await supabase
    .from("order_tasks" as never)
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as OrderTask[];
};

export const fetchOrderProgress = async (orderId: string) => {
  const { data, error } = await supabase
    .from("order_progress" as never)
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OrderProgress[];
};

export const fetchMyCrewRow = async (userId: string) => {
  const { data, error } = await supabase
    .from("crew_members" as never)
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as CrewMember | null;
};

export const fetchCrewTasks = async (crewMemberId: string) => {
  const { data, error } = await supabase
    .from("order_tasks" as never)
    .select("*, orders(id, status, total, currency, scheduled_for, customer_id)")
    .eq("crew_member_id", crewMemberId)
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
};

export const fetchCrewTaskById = async (taskId: string) => {
  const { data, error } = await sb
    .from("order_tasks")
    .select("*, orders(id, status, total, currency, scheduled_for, notes, customer_id)")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const fetchTaskProgress = async (taskId: string) => {
  const { data, error } = await sb
    .from("order_progress")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OrderProgress[];
};

export const fetchOrderTasksForOrder = async (orderId: string) => {
  const { data, error } = await sb
    .from("order_tasks")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as OrderTask[];
};

// Uploads land at order-media/<orderId>/<uuid>.<ext>. Bucket is private,
// so we store the path and resolve a short-lived signed URL on read.
export const uploadOrderMedia = async (orderId: string, file: File) => {
  if (!isProofPhoto(file)) throw new Error("Proof uploads must be JPG, PNG, or WebP photos.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Proof photos must be smaller than 10 MB.");
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const path = `${orderId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("order-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
};

export const signOrderMedia = async (paths: string[], expiresInSeconds = 3600) => {
  if (paths.length === 0) return [] as string[];
  const { data, error } = await supabase.storage.from("order-media").createSignedUrls(paths, expiresInSeconds);
  if (error) throw error;
  return (data ?? []).map((d) => d.signedUrl);
};

export const customerConfirmCompletion = async (orderId: string) => {
  const { error } = await supabase.rpc("customer_confirm_completion" as never, { _order_id: orderId } as never);
  if (error) throw error;
};

export const openDispute = async (orderId: string, reason: string, details: string | null) => {
  const { data, error } = await supabase.rpc("open_dispute" as never, {
    _order_id: orderId,
    _reason: reason,
    _details: details,
  } as never);
  if (error) throw error;
  return data as unknown as string;
};

// ---------- Business profile (settings, hours, change requests, media) ----------

export type Availability = "available" | "busy" | "closed" | "away";

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: "Available now",
  busy: "Busy",
  closed: "Closed",
  away: "Away",
};

export const AVAILABILITY_TONE: Record<Availability, string> = {
  available: "bg-foreground text-background",
  busy: "bg-foreground/20 text-foreground",
  closed: "bg-muted text-muted-foreground",
  away: "bg-foreground/15 text-foreground",
};

export type BusinessSettings = {
  id: string;
  business_id: string;
  availability: Availability;
  away_until: string | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessHourRow = {
  id: string;
  business_id: string;
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_open: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileChangeRequest = {
  id: string;
  business_id: string;
  submitted_by: string;
  field: "name" | "phone" | "email";
  current_value: string | null;
  requested_value: string;
  reason: string | null;
  status: "pending" | "approved" | "denied";
  reviewed_by: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
};

export const fetchBusinessSettings = async (businessId: string) => {
  const { data, error } = await sb
    .from("business_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as BusinessSettings | null;
};

export const upsertBusinessSettings = async (
  businessId: string,
  patch: Partial<Pick<BusinessSettings, "availability" | "away_until" | "cover_url">>,
) => {
  const { error } = await sb
    .from("business_settings")
    .upsert({ business_id: businessId, ...patch }, { onConflict: "business_id" });
  if (error) throw error;
};

export const fetchBusinessHours = async (businessId: string) => {
  const { data, error } = await sb
    .from("business_hours")
    .select("*")
    .eq("business_id", businessId)
    .order("day_of_week")
    .order("opens_at");
  if (error) throw error;
  return (data ?? []) as BusinessHourRow[];
};

export const replaceBusinessHours = async (
  businessId: string,
  rows: Array<Pick<BusinessHourRow, "day_of_week" | "opens_at" | "closes_at" | "is_open">>,
) => {
  const { error: delErr } = await sb.from("business_hours").delete().eq("business_id", businessId);
  if (delErr) throw delErr;
  if (rows.length === 0) return;
  const { error } = await sb
    .from("business_hours")
    .insert(rows.map((r) => ({ ...r, business_id: businessId })));
  if (error) throw error;
};

export const fetchMyChangeRequests = async (businessId: string) => {
  const { data, error } = await sb
    .from("profile_change_requests")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProfileChangeRequest[];
};

export const submitChangeRequest = async (input: {
  business_id: string;
  submitted_by: string;
  field: "name" | "phone" | "email";
  current_value: string | null;
  requested_value: string;
  reason: string | null;
}) => {
  const { error } = await sb.from("profile_change_requests").insert(input);
  if (error) throw error;
};

// Public bucket: business-media/<businessId>/<kind>-<uuid>.<ext>
export const businessImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const businessImageAccept = businessImageMimeTypes.join(",");

export const uploadBusinessImage = async (
  businessId: string,
  file: File,
  kind: "logo" | "cover" | "product",
) => {
  if (!businessImageMimeTypes.includes(file.type as (typeof businessImageMimeTypes)[number])) {
    throw new Error("Use JPG, PNG, or WebP images.");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be smaller than 5 MB.");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${businessId}/${kind}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("business-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("business-media").getPublicUrl(path);
  return data.publicUrl;
};

export const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const listFreeSlots = async (
  businessId: string,
  date: string, // YYYY-MM-DD
  durationMinutes: number,
): Promise<string[]> => {
  const { data, error } = await sb.rpc("list_free_slots", {
    _business_id: businessId,
    _date: date,
    _duration_minutes: durationMinutes,
  });
  if (error) throw error;
  return (data ?? []) as string[];
};

export const fetchBusinessUpcomingScheduled = async (businessId: string, fromIso: string, toIso: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select("id, scheduled_for, status, services(title, duration_minutes)")
    .eq("business_id", businessId)
    .not("scheduled_for", "is", null)
    .gte("scheduled_for", fromIso)
    .lte("scheduled_for", toIso)
    .not("status", "in", "(cancelled,completed)")
    .order("scheduled_for");
  if (error) throw error;
  return data ?? [];
};

export type DaySlot = { slot_start: string; slot_end: string; capacity: number; booked: number };

export const listDaySlots = async (
  businessId: string,
  date: string, // YYYY-MM-DD
  durationMinutes: number,
): Promise<DaySlot[]> => {
  const { data, error } = await sb.rpc("list_day_slots", {
    _business_id: businessId,
    _date: date,
    _duration_minutes: durationMinutes,
  });
  if (error) throw error;
  return (data ?? []) as DaySlot[];
};


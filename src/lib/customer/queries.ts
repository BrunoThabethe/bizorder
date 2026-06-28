import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderEvent = Database["public"]["Tables"]["order_events"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Address = Database["public"]["Tables"]["addresses"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
export type DisputeStatus = "open" | "reviewing" | "resolved" | "rejected";
export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const DISPUTE_STATUS_LABEL: Record<DisputeStatus, string> = {
  open: "Open",
  reviewing: "Under review",
  resolved: "Resolved",
  rejected: "Rejected",
};

export const DISPUTE_STATUS_TONE: Record<DisputeStatus, string> = {
  open: "bg-destructive/15 text-destructive",
  reviewing: "bg-foreground/15 text-foreground",
  resolved: "bg-foreground text-background",
  rejected: "bg-muted text-muted-foreground",
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In progress",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  ready_for_review: "Confirm completion",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<OrderStatus, string> = {
  awaiting_payment: "bg-accent/20 text-foreground",
  pending: "bg-muted text-foreground",
  accepted: "bg-foreground/15 text-foreground",
  in_progress: "bg-foreground text-background",
  ready: "bg-foreground/20 text-foreground",
  out_for_delivery: "bg-foreground/30 text-foreground",
  ready_for_review: "bg-foreground text-background",
  completed: "bg-foreground/10 text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

export const formatPrice = (value: number, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

export const fetchPublishedBusinesses = async () => {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("rating_avg", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as Business[];
};

export const fetchBusinessBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as Business | null;
};

export const fetchBusinessServices = async (businessId: string) => {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("price");
  if (error) throw error;
  return data as Service[];
};

export const fetchMyOrders = async (userId: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, businesses(name, slug, logo_url), services(title)")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const fetchOrderById = async (orderId: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, businesses(name, slug, logo_url, owner_id), services(title, description), addresses(*)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data as
    | (typeof data & {
        rejected_reason?: string | null;
        reference_image_url?: string | null;
        fulfillment_type?: string;
        delivery_distance_km?: number | null;
        delivery_fee?: number | null;
      })
    | null;
};

export const fetchOrderPayment = async (orderId: string) => {
  const { data, error } = await supabase
    .from("order_payments")
    .select("status, checkout_url, funded_at, released_at, last_error")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const startTradeSafeCheckout = async (orderId: string) => {
  // Run the full TradeSafe checkout sequence directly from the client via the
  // tradesafe-proxy edge function. No separate create-checkout function is used.
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, total, notes, customer_id, business_id, services(title), businesses(name)")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) throw orderErr;
  if (!order) throw new Error("Order not found");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", order.customer_id)
    .maybeSingle();

  const fullName = (profile?.full_name ?? "Customer").trim();
  const nameParts = fullName.split(/\s+/);
  const givenName = nameParts[0] || "Customer";
  const familyName = nameParts.slice(1).join(" ") || givenName;
  const email = profile?.email ?? "";
  const mobile = profile?.phone ?? "";

  // Step 1 — Create buyer token
  const buyerRes = await tradeSafeQuery<{ tokenCreate: { id: string } }>(CREATE_BUYER_TOKEN, {
    givenName,
    familyName,
    email,
    mobile,
  });
  const buyerToken = buyerRes.tokenCreate.id;

  // Step 2 — Hardcoded verified seller token
  const sellerToken = TRADESAFE_SELLER_TOKEN;

  // Step 3 — Create transaction
  const serviceTitle = (order as unknown as { services?: { title?: string } | null }).services?.title;
  const businessName = (order as unknown as { businesses?: { name?: string } | null }).businesses?.name;
  const title = serviceTitle ?? "Order";
  const description = order.notes?.trim() || `Order from ${businessName ?? "provider"}`;
  const txRes = await tradeSafeQuery<{ transactionCreate: { id: string } }>(CREATE_TRANSACTION, {
    title,
    description,
    industry: "GENERAL_GOODS_SERVICES",
    value: Number(order.total),
    buyerToken,
    sellerToken,
  });
  const transactionId = txRes.transactionCreate.id;

  await supabase.from("orders").update({ tradesafe_transaction_id: transactionId }).eq("id", orderId);

  // Step 4 — Get checkout link
  const linkRes = await tradeSafeQuery<{ checkoutLink: string }>(GET_CHECKOUT_LINK, {
    id: transactionId,
  });
  const checkoutUrl = linkRes.checkoutLink;
  if (!checkoutUrl) throw new Error("TradeSafe did not return a checkout link");
  return checkoutUrl;
};

export const fetchOrderEvents = async (orderId: string) => {
  const { data, error } = await supabase.from("order_events").select("*").eq("order_id", orderId).order("created_at");
  if (error) throw error;
  return data as OrderEvent[];
};

export const fetchOrderMessages = async (orderId: string) => {
  const { data, error } = await supabase.from("messages").select("*").eq("order_id", orderId).order("created_at");
  if (error) throw error;
  return (data ?? []) as Message[];
};

export const fetchOrderDisputes = async (orderId: string) => {
  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Dispute[];
};

export const fetchMyAddresses = async (userId: string) => {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Address[];
};

export const fetchMyNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as Notification[];
};

export const fetchMyReviews = async (userId: string) => {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, businesses(name, slug, logo_url)")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const fetchMyProfile = async (userId: string) => {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
};

export type ProfileChangeRequest = Database["public"]["Tables"]["profile_change_requests"]["Row"];

export const fetchMyUserChangeRequests = async (userId: string) => {
  const { data, error } = await supabase
    .from("profile_change_requests")
    .select("*")
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProfileChangeRequest[];
};

export const submitUserChangeRequest = async (input: {
  userId: string;
  field: "name" | "phone" | "email";
  currentValue: string | null;
  requestedValue: string;
  reason: string | null;
}) => {
  const { error } = await supabase.from("profile_change_requests").insert({
    target_user_id: input.userId,
    business_id: null,
    submitted_by: input.userId,
    field: input.field,
    current_value: input.currentValue,
    requested_value: input.requestedValue,
    reason: input.reason,
  });
  if (error) throw error;
};

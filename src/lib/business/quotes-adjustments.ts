// Queries and mutations for service tiers, quotes, and order adjustments.
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type ServiceTier = {
  id: string;
  service_id: string;
  label: string;
  price: number;
  duration_hours: number | null;
  sort_order: number;
};

export type Quote = {
  id: string;
  service_id: string;
  business_id: string;
  customer_id: string;
  answers: Array<{ question: string; answer: string }>;
  quoted_price: number | null;
  status: "pending" | "quoted" | "paid" | "cancelled" | "expired";
  paystack_reference: string | null;
  order_id: string | null;
  message: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderAdjustment = {
  id: string;
  order_id: string;
  business_id: string;
  customer_id: string;
  reason: string;
  amount: number;
  paystack_reference: string | null;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  paid_at: string | null;
};

export const fetchServiceTiers = async (serviceId: string) => {
  const { data, error } = await sb
    .from("service_tiers")
    .select("*")
    .eq("service_id", serviceId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as ServiceTier[];
};

export const replaceServiceTiers = async (
  serviceId: string,
  tiers: Array<Pick<ServiceTier, "label" | "price" | "duration_hours">>,
) => {
  const { error: delErr } = await sb.from("service_tiers").delete().eq("service_id", serviceId);
  if (delErr) throw delErr;
  if (tiers.length === 0) return;
  const rows = tiers.map((t, i) => ({
    service_id: serviceId,
    label: t.label,
    price: t.price,
    duration_hours: t.duration_hours,
    sort_order: i,
  }));
  const { error } = await sb.from("service_tiers").insert(rows);
  if (error) throw error;
};

// Business — quote inbox
export const fetchBusinessQuotes = async (businessId: string) => {
  const { data, error } = await sb
    .from("quotes")
    .select("*, services(title)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const quotes = (data ?? []) as Array<Quote & { services: { title: string } | null }>;
  const customerIds = Array.from(new Set(quotes.map((q) => q.customer_id)));
  let profiles: Record<string, { full_name: string | null; email: string }> = {};
  if (customerIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", customerIds);
    profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]));
  }
  return quotes.map((q) => ({ ...q, profile: profiles[q.customer_id] ?? null }));
};

export const sendQuotePrice = async (quoteId: string, price: number) => {
  const { error } = await sb
    .from("quotes")
    .update({ quoted_price: price, status: "quoted" })
    .eq("id", quoteId);
  if (error) throw error;
};

// Customer — quotes list
export const fetchCustomerQuotes = async (customerId: string) => {
  const { data, error } = await sb
    .from("quotes")
    .select("*, services(title), businesses(name, slug)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<
    Quote & {
      services: { title: string } | null;
      businesses: { name: string; slug: string } | null;
    }
  >;
};

export const createQuoteRequest = async (input: {
  service_id: string;
  business_id: string;
  customer_id: string;
  answers: Array<{ question: string; answer: string }>;
  message?: string | null;
}) => {
  const { data, error } = await sb.from("quotes").insert(input).select("id").single();
  if (error) throw error;
  return data.id as string;
};

// Adjustments
export const fetchOrderAdjustments = async (orderId: string) => {
  const { data, error } = await sb
    .from("order_adjustments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrderAdjustment[];
};

export const createOrderAdjustment = async (input: {
  order_id: string;
  business_id: string;
  customer_id: string;
  reason: string;
  amount: number;
}) => {
  const { data, error } = await sb
    .from("order_adjustments")
    .insert(input)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
};

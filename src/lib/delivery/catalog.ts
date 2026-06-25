// Trusted courier catalog with preset pricing (manual fulfilment — no API).
// Update prices here as carriers change tariffs.

export type DeliveryProvider = "paxi" | "pudo" | "courier_guy" | "self";

export type DeliveryOption = {
  id: string; // unique within product (e.g. "paxi:std:7-9")
  provider: DeliveryProvider;
  label: string; // human readable e.g. "Paxi Standard Bag (7–9 days)"
  price: number; // ZAR
  eta: string; // human ETA e.g. "7–9 business days"
  area?: string; // for self-delivery
};

export type CourierVariant = {
  id: string; // suffix
  label: string;
  price: number;
  eta: string;
};

export type CourierCatalogEntry = {
  provider: DeliveryProvider;
  name: string;
  blurb: string;
  variants: CourierVariant[];
};

export const COURIER_CATALOG: CourierCatalogEntry[] = [
  {
    provider: "paxi",
    name: "Pep Paxi",
    blurb: "Store-to-store via Pep. Customer collects from nearest Pep.",
    variants: [
      { id: "std-7-9", label: "Standard Bag (≤5kg) · 7–9 days", price: 59.95, eta: "7–9 business days" },
      { id: "std-3-5", label: "Standard Bag (≤5kg) · 3–5 days", price: 109.95, eta: "3–5 business days" },
      { id: "lg-7-9", label: "Large Bag (≤10kg) · 7–9 days", price: 109.95, eta: "7–9 business days" },
      { id: "lg-3-5", label: "Large Bag (≤10kg) · 3–5 days", price: 139.95, eta: "3–5 business days" },
      { id: "s2h", label: "Store-to-Home · 3–5 days", price: 199.0, eta: "3–5 business days" },
    ],
  },
  {
    provider: "pudo",
    name: "Pudo",
    blurb: "Locker & kiosk drop-offs across SA.",
    variants: [
      { id: "l-l2d", label: "L · Locker-to-Door", price: 157, eta: "1–3 business days" },
      { id: "xl-l2d", label: "XL · Locker-to-Door", price: 209, eta: "1–3 business days" },
      { id: "xl-k2d", label: "XL · Kiosk-to-Door", price: 250, eta: "1–3 business days" },
      { id: "d2l", label: "Door-to-Locker", price: 85, eta: "1–3 business days" },
    ],
  },
  {
    provider: "courier_guy",
    name: "The Courier Guy",
    blurb: "Door-to-door national & local courier.",
    variants: [
      { id: "nat-overnight-2kg", label: "National Overnight (≤2kg)", price: 130, eta: "Next business day" },
      { id: "nat-eco-0-5", label: "National Economy Road (0–5kg)", price: 90, eta: "2–4 business days" },
      { id: "nat-eco-6-15", label: "National Economy Road (6–15kg)", price: 150, eta: "2–4 business days" },
      { id: "nat-eco-16-25", label: "National Economy Road (16–25kg)", price: 200, eta: "2–4 business days" },
      { id: "local-overnight", label: "Local Overnight (1 box)", price: 105, eta: "Next business day" },
      { id: "local-sameday", label: "Local Same-Day Express (≤2kg)", price: 755, eta: "Same day" },
      { id: "intl", label: "International (from)", price: 310, eta: "Varies by destination" },
    ],
  },
];

export const PROVIDER_NAME: Record<DeliveryProvider, string> = {
  paxi: "Pep Paxi",
  pudo: "Pudo",
  courier_guy: "The Courier Guy",
  self: "Self-delivery",
};

export const formatRand = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n);

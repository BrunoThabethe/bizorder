import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImageIcon, Loader2, MapPin, ShieldCheck, Truck, Store, X } from "lucide-react";
import { z } from "zod";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchBusinessServices,
  fetchMyAddresses,
  formatPrice,
  type Address,
  type Service,
} from "@/lib/customer/queries";
import { AVAILABILITY_LABEL, fetchBusinessSettings, type Availability } from "@/lib/business/queries";

const orderSchema = z.object({
  serviceId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
  scheduledFor: z.string().optional(),
});

const refImageMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const fetchBusiness = async (id: string) => {
  const { data, error } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
};

type ServiceWithDelivery = Service & {
  kind?: string;
  delivery_available?: boolean;
  delivery_price_per_km?: number;
};

const CreateOrderPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const businessId = searchParams.get("business") ?? "";
  const initialServiceId = searchParams.get("service") ?? "";

  const [serviceId, setServiceId] = useState(initialServiceId);
  const [addressId, setAddressId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);

  const { data: business } = useQuery({
    queryKey: ["business-by-id", businessId],
    queryFn: () => fetchBusiness(businessId),
    enabled: !!businessId,
  });
  const { data: services = [] } = useQuery({
    queryKey: ["business-services", businessId],
    queryFn: () => fetchBusinessServices(businessId),
    enabled: !!businessId,
  });
  const { data: addresses = [] } = useQuery({
    queryKey: ["my-addresses", user?.id],
    queryFn: () => fetchMyAddresses(user?.id as string),
    enabled: !!user?.id,
  });
  const { data: settings } = useQuery({
    queryKey: ["business-settings", businessId],
    queryFn: () => fetchBusinessSettings(businessId),
    enabled: !!businessId,
  });

  useEffect(() => {
    if (!serviceId && services[0]) setServiceId(services[0].id);
  }, [services, serviceId]);

  useEffect(() => {
    if (!addressId && addresses[0]) setAddressId(addresses[0].id);
  }, [addresses, addressId]);

  const selectedService = services.find((s) => s.id === serviceId) as ServiceWithDelivery | undefined;
  const selectedAddress = addresses.find((a) => a.id === addressId) as Address | undefined;
  const itemKind = (selectedService?.kind ?? "service") as "service" | "product";
  const availability = (settings?.availability ?? "available") as Availability;
  const isService = itemKind === "service";

  const deliveryAvailable = !!selectedService?.delivery_available;
  const perKm = Number(selectedService?.delivery_price_per_km ?? 0);
  const km = distanceKm ?? 0;
  const deliveryFee = fulfillment === "delivery" ? Math.max(0, perKm * km) : 0;
  const basePrice = Number(selectedService?.price ?? 0);
  const total = basePrice + deliveryFee;

  // Availability gating: services need provider available OR a future scheduled time
  const scheduledFuture = scheduledFor && new Date(scheduledFor).getTime() > Date.now() + 30 * 60 * 1000;
  const blockedByAvailability = isService && availability !== "available" && !scheduledFuture;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !business || !selectedService) return;

    if (blockedByAvailability) {
      toast({
        title: "Provider is not available now",
        description: `Pick a future date and time to schedule this service.`,
        variant: "destructive",
      });
      return;
    }
    if (fulfillment === "delivery" && (!km || km <= 0)) {
      toast({ title: "Delivery distance required", description: "Enter how far you are in km.", variant: "destructive" });
      return;
    }

    const parsed = orderSchema.safeParse({ serviceId, notes, scheduledFor });
    if (!parsed.success) {
      toast({ title: "Check your details", description: parsed.error.issues[0]?.message ?? "Invalid input", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    // Slot clash check for services with a scheduled time
    if (isService && scheduledFor) {
      const start = new Date(scheduledFor).toISOString();
      const end = new Date(new Date(scheduledFor).getTime() + (selectedService.duration_minutes ?? 60) * 60_000).toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: free, error: slotErr } = await (supabase as any).rpc("is_slot_available", {
        _business_id: business.id,
        _start: start,
        _end: end,
      });
      if (slotErr) {
        setSubmitting(false);
        toast({ title: "Could not check availability", description: slotErr.message, variant: "destructive" });
        return;
      }
      if (!free) {
        setSubmitting(false);
        toast({
          title: "That time is already booked",
          description: "Please pick a different date or time.",
          variant: "destructive",
        });
        return;
      }
    }

    const payload = {
      customer_id: user.id,
      business_id: business.id,
      service_id: selectedService.id,
      address_id: fulfillment === "delivery" ? addressId || null : null,
      total,
      currency: selectedService.currency,
      notes: notes || null,
      scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      fulfillment_type: fulfillment,
      delivery_distance_km: fulfillment === "delivery" ? km : null,
      delivery_fee: deliveryFee,
    };

    const { data: order, error } = await supabase.from("orders").insert(payload).select("id").single();

    if (error || !order) {
      setSubmitting(false);
      toast({ title: "Could not place order", description: error?.message ?? "Try again", variant: "destructive" });
      return;
    }

    // Reference photo upload (single, optional)
    if (refFile) {
      const ext = (refFile.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${order.id}/reference-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("order-media").upload(path, refFile, {
        contentType: refFile.type,
        upsert: false,
      });
      if (!upErr) {
        await supabase.from("orders").update({ reference_image_url: path }).eq("id", order.id);
      }
    }

    await supabase.from("order_events").insert({
      order_id: order.id,
      actor_id: user.id,
      type: "created",
      message: fulfillment === "delivery" ? `Delivery requested · ${km} km` : "Pickup / in-store",
    });

    setSubmitting(false);
    toast({ title: "Order placed", description: "We've notified the provider." });
    navigate(`/customer/orders/${order.id}`);
  };

  if (!businessId) {
    return (
      <CustomerLayout>
        <div className="grid place-items-center rounded-3xl bg-card p-10 text-center shadow-card">
          <p className="font-display text-lg font-bold">Pick a business first</p>
          <Button asChild className="mt-4">
            <Link to="/customer/browse">Browse businesses</Link>
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const refPreview = useMemo(() => (refFile ? URL.createObjectURL(refFile) : null), [refFile]);

  return (
    <CustomerLayout>
      <Link
        to={business?.slug ? `/customer/business/${business.slug}` : "/customer/browse"}
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back
      </Link>

      <PageHeader
        eyebrow="New order"
        title={business ? `Order from ${business.name}` : "Create order"}
        description="Pick a service, add details, and confirm — the provider will accept and start work."
      />

      {isService && availability !== "available" ? (
        <div className="mb-4 rounded-2xl border border-foreground/15 bg-foreground/5 p-4 text-sm">
          <p className="font-display text-sm font-bold">Provider is {AVAILABILITY_LABEL[availability].toLowerCase()}</p>
          <p className="mt-1 text-muted-foreground">
            You can still book this service for a later date — pick a date & time below.
          </p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Choose a service or product</h2>
            <div className="mt-3 grid gap-2">
              {services.map((s) => {
                const sw = s as ServiceWithDelivery;
                return (
                  <label
                    key={sw.id}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl p-3 transition-colors ${
                      serviceId === sw.id ? "bg-foreground text-background" : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="service"
                        value={sw.id}
                        checked={serviceId === sw.id}
                        onChange={() => setServiceId(sw.id)}
                        className="h-4 w-4 accent-foreground"
                      />
                      <div>
                        <p className="font-display text-sm font-bold">
                          {sw.title}{" "}
                          <span className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            serviceId === sw.id ? "bg-background/20 text-background" : "bg-foreground/10 text-foreground"
                          }`}>
                            {(sw.kind ?? "service") === "product" ? "Product" : "Service"}
                          </span>
                        </p>
                        <p className={`text-xs ${serviceId === sw.id ? "text-background/70" : "text-muted-foreground"}`}>
                          {sw.duration_minutes ? `${sw.duration_minutes} min · ` : ""}
                          {sw.description?.slice(0, 60) ?? ""}
                        </p>
                      </div>
                    </div>
                    <span className="font-display text-sm font-bold">{formatPrice(Number(sw.price), sw.currency)}</span>
                  </label>
                );
              })}
              {services.length === 0 ? (
                <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                  This business has no services available right now.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">How would you like it?</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFulfillment("pickup")}
                className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
                  fulfillment === "pickup" ? "border-foreground bg-foreground/5" : "border-border bg-muted/30"
                }`}
              >
                <Store className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-display text-sm font-bold">Pickup / in-store</p>
                  <p className="text-xs text-muted-foreground">No delivery fee.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => deliveryAvailable && setFulfillment("delivery")}
                disabled={!deliveryAvailable}
                className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
                  fulfillment === "delivery" ? "border-foreground bg-foreground/5" : "border-border bg-muted/30"
                } ${!deliveryAvailable ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <Truck className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-display text-sm font-bold">Delivery</p>
                  <p className="text-xs text-muted-foreground">
                    {deliveryAvailable
                      ? `${formatPrice(perKm, selectedService?.currency)} / km`
                      : "Not offered for this item."}
                  </p>
                </div>
              </button>
            </div>

            {fulfillment === "delivery" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="km">Distance (km)</Label>
                  <Input
                    id="km"
                    type="number"
                    min={0}
                    step={0.1}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    placeholder="e.g. 4.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Delivery address</Label>
                  <Select value={addressId} onValueChange={setAddressId}>
                    <SelectTrigger className="h-11 rounded-2xl border-0 bg-muted">
                      <SelectValue placeholder={addresses.length ? "Pick an address" : "Add an address first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label} · {a.line1}, {a.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {addresses.length === 0 ? (
                    <Button asChild variant="secondary" size="sm" type="button">
                      <Link to="/customer/addresses">Add an address</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Details</h2>
            <div className="mt-3 grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="scheduledFor">Preferred date and time {isService && availability !== "available" ? "(required)" : "(optional)"}</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="h-11 rounded-2xl border-0 bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes for the provider</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything they should know — references, allergies, instructions, etc."
                  maxLength={1000}
                  className="min-h-[120px] rounded-2xl border-0 bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Reference photo (optional, 1 image)</Label>
                {refPreview ? (
                  <div className="relative h-40 w-40 overflow-hidden rounded-2xl bg-muted">
                    <img src={refPreview} alt="Reference" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setRefFile(null)}
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-foreground shadow-card"
                      aria-label="Remove reference photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground hover:bg-muted/50">
                    <ImageIcon className="h-5 w-5" />
                    <span>Click to attach a reference photo (JPG, PNG, WebP · max 5 MB)</span>
                    <input
                      type="file"
                      accept={refImageMimeTypes.join(",")}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (!f) return;
                        if (!refImageMimeTypes.includes(f.type)) {
                          toast({ title: "Use a JPG, PNG, or WebP image", variant: "destructive" });
                          return;
                        }
                        if (f.size > 5 * 1024 * 1024) {
                          toast({ title: "Image too large", description: "Max 5 MB.", variant: "destructive" });
                          return;
                        }
                        setRefFile(f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Payment</h2>
            <div className="mt-3 flex items-start gap-3 rounded-2xl bg-muted/50 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-sm font-bold">Pay on completion</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No money moves now. You'll pay your provider once you've approved the work — secure online payments are coming soon.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Item">{selectedService?.title ?? "—"}</Row>
              <Row label="Provider">{business?.name ?? "—"}</Row>
              <Row label="Fulfilment">{fulfillment === "delivery" ? "Delivery" : "Pickup / in-store"}</Row>
              {fulfillment === "delivery" && (
                <Row label="Distance">{km > 0 ? `${km} km × ${formatPrice(perKm, selectedService?.currency)}` : "—"}</Row>
              )}
              <Row label="Address">{fulfillment === "delivery" ? selectedAddress?.label ?? "Not set" : "Not needed"}</Row>
              <Row label="When">{scheduledFor ? new Date(scheduledFor).toLocaleString("en-GB") : "As soon as possible"}</Row>
              <div className="my-3 h-px bg-border" />
              <Row label="Item price">{selectedService ? formatPrice(basePrice, selectedService.currency) : "—"}</Row>
              {deliveryFee > 0 && (
                <Row label="Delivery fee">{formatPrice(deliveryFee, selectedService?.currency)}</Row>
              )}
              <Row label="Total">
                <span className="font-display text-lg font-bold">
                  {selectedService ? formatPrice(total, selectedService.currency) : "—"}
                </span>
              </Row>
            </dl>
            <Button
              type="submit"
              size="lg"
              className="mt-4 w-full"
              disabled={submitting || !selectedService || blockedByAvailability}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place order"}
            </Button>
            {blockedByAvailability ? (
              <p className="mt-2 text-center text-[11px] text-destructive">
                Pick a future date/time to schedule this service.
              </p>
            ) : null}
          </section>
        </aside>
      </form>
    </CustomerLayout>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="text-right text-sm font-semibold">{children}</dd>
  </div>
);

export { CreateOrderPage };
export default CreateOrderPage;

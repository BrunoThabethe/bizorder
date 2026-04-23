import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Wallet } from "lucide-react";
import { z } from "zod";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const orderSchema = z.object({
  serviceId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
  scheduledFor: z.string().optional(),
});

const fetchBusiness = async (id: string) => {
  const { data, error } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
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
  const [paymentMethod, setPaymentMethod] = useState<"escrow" | "cash">("escrow");
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    if (!serviceId && services[0]) setServiceId(services[0].id);
  }, [services, serviceId]);

  useEffect(() => {
    if (!addressId && addresses[0]) setAddressId(addresses[0].id);
  }, [addresses, addressId]);

  const selectedService = services.find((s) => s.id === serviceId) as Service | undefined;
  const selectedAddress = addresses.find((a) => a.id === addressId) as Address | undefined;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !business || !selectedService) return;

    const parsed = orderSchema.safeParse({ serviceId, notes, scheduledFor });
    if (!parsed.success) {
      toast({ title: "Check your details", description: parsed.error.issues[0]?.message ?? "Invalid input", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const payload = {
      customer_id: user.id,
      business_id: business.id,
      service_id: selectedService.id,
      address_id: addressId || null,
      total: Number(selectedService.price),
      currency: selectedService.currency,
      notes: notes || null,
      scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
    };

    const { data: order, error } = await supabase.from("orders").insert(payload).select("id").single();

    if (error || !order) {
      setSubmitting(false);
      toast({ title: "Could not place order", description: error?.message ?? "Try again", variant: "destructive" });
      return;
    }

    await supabase.from("order_events").insert({
      order_id: order.id,
      actor_id: user.id,
      type: "created",
      message: `Order placed (${paymentMethod === "escrow" ? "Escrow payment" : "Pay on delivery"})`,
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

      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Choose a service</h2>
            <div className="mt-3 grid gap-2">
              {services.map((s) => (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl p-3 transition-colors ${
                    serviceId === s.id ? "bg-foreground text-background" : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="service"
                      value={s.id}
                      checked={serviceId === s.id}
                      onChange={() => setServiceId(s.id)}
                      className="h-4 w-4 accent-foreground"
                    />
                    <div>
                      <p className="font-display text-sm font-bold">{s.title}</p>
                      <p className={`text-xs ${serviceId === s.id ? "text-background/70" : "text-muted-foreground"}`}>
                        {s.duration_minutes ? `${s.duration_minutes} min · ` : ""}
                        {s.description?.slice(0, 60) ?? ""}
                      </p>
                    </div>
                  </div>
                  <span className="font-display text-sm font-bold">{formatPrice(Number(s.price), s.currency)}</span>
                </label>
              ))}
              {services.length === 0 ? (
                <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                  This business has no services available right now.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Details</h2>
            <div className="mt-3 grid gap-3">
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

              <div className="space-y-2">
                <Label htmlFor="scheduledFor">Preferred date and time (optional)</Label>
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
                  placeholder="Anything they should know — references, address details, allergies, etc."
                  maxLength={1000}
                  className="min-h-[120px] rounded-2xl border-0 bg-muted"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Payment</h2>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)} className="mt-3 grid gap-2">
              <PaymentOption value="escrow" title="Escrow payment" text="Held safely until you approve completion." />
              <PaymentOption value="cash" title="Pay on delivery" text="Pay the provider directly when work is done." />
            </RadioGroup>
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground">
              <Wallet className="mt-0.5 h-3 w-3 shrink-0" /> Escrow integration coming soon — for now, the order is recorded and the provider will confirm payment offline.
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Service">{selectedService?.title ?? "—"}</Row>
              <Row label="Provider">{business?.name ?? "—"}</Row>
              <Row label="Address">{selectedAddress ? `${selectedAddress.label}` : "Not set"}</Row>
              <Row label="When">{scheduledFor ? new Date(scheduledFor).toLocaleString("en-GB") : "As soon as possible"}</Row>
              <div className="my-3 h-px bg-border" />
              <Row label="Total">
                <span className="font-display text-lg font-bold">
                  {selectedService ? formatPrice(Number(selectedService.price), selectedService.currency) : "—"}
                </span>
              </Row>
            </dl>
            <Button type="submit" size="lg" className="mt-4 w-full" disabled={submitting || !selectedService}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place order"}
            </Button>
          </section>
        </aside>
      </form>
    </CustomerLayout>
  );
};

const PaymentOption = ({ value, title, text }: { value: string; title: string; text: string }) => (
  <label
    className="flex cursor-pointer items-start gap-3 rounded-2xl bg-muted/50 p-3 transition-colors hover:bg-muted"
    htmlFor={`pay-${value}`}
  >
    <RadioGroupItem id={`pay-${value}`} value={value} className="mt-1" />
    <div>
      <p className="font-display text-sm font-bold">{title}</p>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  </label>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="text-right text-sm font-semibold">{children}</dd>
  </div>
);

export { CreateOrderPage };
export default CreateOrderPage;

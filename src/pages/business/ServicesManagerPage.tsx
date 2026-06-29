import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  businessImageAccept,
  fetchBusinessServices,
  fetchMyBusiness,
  formatPrice,
  uploadBusinessImage,
  type Service,
} from "@/lib/business/queries";
import { DeliveryOptionsEditor } from "@/components/business/DeliveryOptionsEditor";
import type { DeliveryOption } from "@/lib/delivery/catalog";
import {
  fetchServiceTiers,
  replaceServiceTiers,
  type ServiceTier,
} from "@/lib/business/quotes-adjustments";

type CatalogKind = "service" | "product";
type PriceMode = "fixed" | "range";
type ServiceTypeValue = "fixed" | "tiered" | "quote_based" | "hourly";

type TierDraft = { label: string; price: string; duration_hours: string };
type QuestionDraft = { question: string };


const MAX_IMAGES = 3;

type ServiceExtra = {
  kind?: string;
  images?: string[] | null;
  price_min?: number | null;
  price_max?: number | null;
  delivery_available?: boolean | null;
  delivery_options?: DeliveryOption[] | null;
  service_type?: ServiceTypeValue | null;
  hourly_rate?: number | null;
  quote_questions?: Array<{ question: string }> | null;
};

const emptyForm = {
  kind: "service" as CatalogKind,
  serviceType: "fixed" as ServiceTypeValue,
  priceMode: "fixed" as PriceMode,
  title: "",
  price: "",
  priceMin: "",
  priceMax: "",
  hourlyRate: "",
  duration: "",
  description: "",
  images: [] as string[],
  deliveryAvailable: false,
  deliveryOptions: [] as DeliveryOption[],
  tiers: [] as TierDraft[],
  questions: [] as QuestionDraft[],
};


const ServicesManagerPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const { data: business } = useQuery({
    queryKey: ["my-business", userId],
    queryFn: () => fetchMyBusiness(userId),
    enabled: !!userId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["business-services", business?.id],
    queryFn: () => fetchBusinessServices(business!.id),
    enabled: !!business?.id,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const loadIntoForm = async (s: Service) => {
    const extra = s as unknown as ServiceExtra;
    const kind = (extra.kind ?? "service") as CatalogKind;
    const stype = (extra.service_type ?? "fixed") as ServiceTypeValue;
    const hasRange =
      extra.price_min !== null && extra.price_min !== undefined &&
      extra.price_max !== null && extra.price_max !== undefined;
    const imgs = Array.isArray(extra.images) ? extra.images.filter(Boolean) : [];
    if (imgs.length === 0 && s.image_url) imgs.push(s.image_url);
    let tiers: TierDraft[] = [];
    if (stype === "tiered" || stype === "hourly") {
      try {
        const dbTiers = await fetchServiceTiers(s.id);
        tiers = dbTiers.map((t: ServiceTier) => ({
          label: t.label,
          price: String(t.price ?? ""),
          duration_hours: t.duration_hours != null ? String(t.duration_hours) : "",
        }));
      } catch {
        tiers = [];
      }
    }
    const questions: QuestionDraft[] = Array.isArray(extra.quote_questions)
      ? extra.quote_questions.map((q) => ({ question: q.question ?? "" }))
      : [];
    setEditingId(s.id);
    setForm({
      kind,
      serviceType: stype,
      priceMode: hasRange ? "range" : "fixed",
      title: s.title,
      price: hasRange ? "" : String(s.price ?? ""),
      priceMin: hasRange ? String(extra.price_min ?? "") : "",
      priceMax: hasRange ? String(extra.price_max ?? "") : "",
      hourlyRate: extra.hourly_rate != null ? String(extra.hourly_rate) : "",
      duration: s.duration_minutes ? String(s.duration_minutes) : "",
      description: s.description ?? "",
      images: imgs.slice(0, MAX_IMAGES),
      deliveryAvailable: !!extra.delivery_available,
      deliveryOptions: Array.isArray(extra.delivery_options) ? extra.delivery_options : [],
      tiers,
      questions,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };


  const onUploadImage = async (file: File) => {
    if (!business) {
      toast({ title: "Save your business first", variant: "destructive" });
      return;
    }
    if (form.images.length >= MAX_IMAGES) {
      toast({ title: `Up to ${MAX_IMAGES} photos`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadBusinessImage(business.id, file, "product");
      setForm((f) => ({ ...f, images: [...f.images, url].slice(0, MAX_IMAGES) }));
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => {
    setForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("Create your business profile first");
      if (form.kind === "product" && form.images.length === 0) {
        throw new Error("Add at least one product photo.");
      }
      const stype: ServiceTypeValue = form.kind === "product" ? "fixed" : form.serviceType;
      const isRange = form.priceMode === "range";
      const minVal = isRange ? Number(form.priceMin) : null;
      const maxVal = isRange ? Number(form.priceMax) : null;

      // Validation per service type
      if (stype === "fixed") {
        if (isRange) {
          if (!form.priceMin || !form.priceMax) throw new Error("Add both a minimum and maximum price.");
          if ((minVal ?? 0) < 0 || (maxVal ?? 0) < 0) throw new Error("Prices must be zero or more.");
          if ((minVal ?? 0) > (maxVal ?? 0)) throw new Error("Minimum price must be lower than the maximum.");
        } else if (!form.price) {
          throw new Error("Add a price.");
        }
      } else if (stype === "tiered" || stype === "hourly") {
        if (form.tiers.length === 0) throw new Error("Add at least one tier.");
        for (const t of form.tiers) {
          if (!t.label.trim()) throw new Error("Each tier needs a label.");
          if (!t.price || Number(t.price) < 0) throw new Error("Each tier needs a valid price.");
          if (stype === "hourly" && (!t.duration_hours || Number(t.duration_hours) <= 0)) {
            throw new Error("Each hourly tier needs a duration in hours.");
          }
        }
        if (stype === "hourly" && (!form.hourlyRate || Number(form.hourlyRate) <= 0)) {
          throw new Error("Set an hourly rate.");
        }
      } else if (stype === "quote_based") {
        if (form.questions.length === 0 || form.questions.some((q) => !q.question.trim())) {
          throw new Error("Add at least one quote question.");
        }
      }

      const primaryImage = form.images[0] ?? null;
      // For non-fixed services, anchor price to the lowest tier (or 0 for quote-based)
      const tierPrices = form.tiers.map((t) => Number(t.price) || 0);
      const anchorPrice =
        stype === "fixed"
          ? isRange
            ? (minVal ?? 0)
            : Number(form.price) || 0
          : stype === "quote_based"
            ? 0
            : tierPrices.length
              ? Math.min(...tierPrices)
              : 0;

      const row = {
        business_id: business.id,
        title: form.title,
        description: form.description || null,
        price: anchorPrice,
        duration_minutes: form.kind === "service" && form.duration ? Number(form.duration) : null,
        image_url: primaryImage,
        is_active: true,
        ...({
          kind: form.kind,
          images: form.images,
          delivery_available: form.kind === "product" ? form.deliveryOptions.length > 0 : form.deliveryAvailable,
          delivery_price_per_km: 0,
          delivery_options: form.kind === "product" ? form.deliveryOptions : [],
          price_min: stype === "fixed" && isRange ? minVal : null,
          price_max: stype === "fixed" && isRange ? maxVal : null,
          service_type: stype,
          hourly_rate: stype === "hourly" ? Number(form.hourlyRate) || null : null,
          quote_questions: stype === "quote_based"
            ? form.questions.map((q) => ({ question: q.question.trim() }))
            : [],
        } as Record<string, unknown>),
      };

      let serviceId = editingId;
      if (editingId) {
        const { error } = await supabase.from("services").update(row).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("services").insert(row).select("id").single();
        if (error) throw error;
        serviceId = data.id;
      }

      // Sync tiers
      if (serviceId) {
        if (stype === "tiered" || stype === "hourly") {
          await replaceServiceTiers(
            serviceId,
            form.tiers.map((t) => ({
              label: t.label.trim(),
              price: Number(t.price) || 0,
              duration_hours: stype === "hourly" ? Number(t.duration_hours) || null : null,
            })),
          );
        } else {
          await replaceServiceTiers(serviceId, []);
        }
      }
    },
    onSuccess: () => {
      const wasEditing = !!editingId;
      resetForm();
      qc.invalidateQueries({ queryKey: ["business-services", business?.id] });
      toast({ title: wasEditing ? "Saved changes" : form.kind === "product" ? "Product added" : "Service added" });
    },
    onError: (e: Error) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });


  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-services", business?.id] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      if (editingId === id) resetForm();
      qc.invalidateQueries({ queryKey: ["business-services", business?.id] });
      toast({ title: "Removed" });
    },
  });

  // Clear edit state if the edited item disappears (e.g. removed elsewhere)
  useEffect(() => {
    if (editingId && !services.some((s) => s.id === editingId)) setEditingId(null);
  }, [services, editingId]);

  const canSubmit =
    !!form.title &&
    (form.priceMode === "fixed" ? !!form.price : !!form.priceMin && !!form.priceMax) &&
    !save.isPending;

  return (
    <BusinessLayout>
      <PageHeader eyebrow="Catalog" title="Services & products" description="Anything you sell — name it, price it, publish it." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                {editingId ? "Edit item" : "Add a new item"}
              </h2>
              {editingId ? (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kind">Type</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm((f) => ({ ...f, kind: v as CatalogKind }))}
              >
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service (a job you do)</SelectItem>
                  <SelectItem value="product">Product / item (something you sell)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">{form.kind === "product" ? "Product name" : "Service name"}</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceMode">Price type</Label>
              <Select
                value={form.priceMode}
                onValueChange={(v) => setForm((f) => ({ ...f, priceMode: v as PriceMode }))}
              >
                <SelectTrigger id="priceMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed price</SelectItem>
                  <SelectItem value="range">Price range (from – to)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Use a range when the final price depends on the job (e.g. R350 – R600).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {form.priceMode === "fixed" ? (
                <div className="space-y-2">
                  <Label htmlFor="price">Price (ZAR)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="priceMin">From (ZAR)</Label>
                    <Input
                      id="priceMin"
                      type="number"
                      min={0}
                      value={form.priceMin}
                      onChange={(e) => setForm((f) => ({ ...f, priceMin: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceMax">To (ZAR)</Label>
                    <Input
                      id="priceMax"
                      type="number"
                      min={0}
                      value={form.priceMax}
                      onChange={(e) => setForm((f) => ({ ...f, priceMax: e.target.value }))}
                    />
                  </div>
                </>
              )}
              {form.kind === "service" && form.priceMode === "fixed" && (
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={0}
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {form.kind === "service" && form.priceMode === "range" && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={0}
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={600}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Photos{" "}
                <span className="text-[11px] font-normal text-muted-foreground">
                  ({form.images.length}/{MAX_IMAGES}
                  {form.kind === "product" ? " · at least 1 required" : " · optional"})
                </span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {form.images.map((url) => (
                  <div key={url} className="relative h-24 overflow-hidden rounded-xl bg-muted">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-foreground shadow-card hover:bg-background"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {form.images.length < MAX_IMAGES ? (
                  <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted/30 text-[10px] text-muted-foreground hover:bg-muted/50">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    <span>{uploading ? "Uploading…" : "Add photo"}</span>
                    <input
                      type="file"
                      accept={businessImageAccept}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadImage(f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">JPG, PNG or WebP · max 5 MB each.</p>
            </div>

            {form.kind === "product" ? (
              <DeliveryOptionsEditor
                options={form.deliveryOptions}
                onChange={(options) => setForm((f) => ({ ...f, deliveryOptions: options }))}
              />
            ) : (
              <div className="rounded-2xl bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="delivery">Offer delivery</Label>
                    <p className="text-[11px] text-muted-foreground">
                      You'll arrange the delivery fee directly with the customer.
                    </p>
                  </div>
                  <Switch
                    id="delivery"
                    checked={form.deliveryAvailable}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, deliveryAvailable: checked }))}
                  />
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => save.mutate()} disabled={!canSubmit}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editingId
                ? " Save changes"
                : form.kind === "product"
                  ? " Add product"
                  : " Add service"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display text-lg font-bold">Your catalog ({services.length})</h2>
            {services.length === 0 ? (
              <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
                Add your first service or product to start receiving orders.
              </p>
            ) : (
              <ul className="space-y-2">
                {services.map((s: Service) => {
                  const extra = s as unknown as ServiceExtra;
                  const itemKind = (extra.kind ?? "service") as CatalogKind;
                  const hasRange =
                    extra.price_min !== null && extra.price_min !== undefined &&
                    extra.price_max !== null && extra.price_max !== undefined;
                  const priceLabel = hasRange
                    ? `${formatPrice(Number(extra.price_min), s.currency)} – ${formatPrice(Number(extra.price_max), s.currency)}`
                    : formatPrice(Number(s.price), s.currency);
                  const imgs = Array.isArray(extra.images) ? extra.images.filter(Boolean) : [];
                  const primary = imgs[0] ?? s.image_url ?? null;
                  const isEditing = editingId === s.id;
                  return (
                    <li
                      key={s.id}
                      className={`flex items-center gap-3 rounded-2xl border p-3 ${isEditing ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      {primary ? (
                        <img src={primary} alt={s.title} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {itemKind === "product" ? "Product" : "Service"}
                          </span>
                          <p className="truncate font-semibold">{s.title}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {priceLabel}
                          {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
                          {imgs.length > 1 ? ` · ${imgs.length} photos` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.is_active}
                          onCheckedChange={(v) => toggle.mutate({ id: s.id, active: v })}
                        />
                        <button
                          onClick={() => loadIntoForm(s)}
                          className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground hover:text-primary"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove.mutate(s.id)}
                          className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground hover:text-destructive"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </BusinessLayout>
  );
};

export { ServicesManagerPage };
export default ServicesManagerPage;

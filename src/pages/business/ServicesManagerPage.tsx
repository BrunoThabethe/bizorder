import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Loader2, Plus, Trash2, X } from "lucide-react";
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

type CatalogKind = "service" | "product";

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

  const [kind, setKind] = useState<CatalogKind>("service");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);

  const onUploadProductImage = async (file: File) => {
    if (!business) {
      toast({ title: "Save your business first", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadBusinessImage(business.id, file, "product");
      setImageUrl(url);
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("Create your business profile first");
      if (kind === "product" && !imageUrl) throw new Error("Add a product photo so customers can see it.");
      const { error } = await supabase.from("services").insert({
        business_id: business.id,
        title,
        description: description || null,
        price: Number(price) || 0,
        duration_minutes: kind === "service" && duration ? Number(duration) : null,
        image_url: kind === "product" ? imageUrl : null,
        is_active: true,
        ...({
          kind,
          delivery_available: deliveryAvailable,
          delivery_price_per_km: deliveryAvailable ? Number(deliveryPerKm) || 0 : 0,
        } as Record<string, unknown>),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setPrice("");
      setDuration("");
      setDescription("");
      setImageUrl("");
      setDeliveryAvailable(false);
      setDeliveryPerKm("");
      qc.invalidateQueries({ queryKey: ["business-services", business?.id] });
      toast({ title: kind === "product" ? "Product added" : "Service added" });
    },
    onError: (e: Error) => toast({ title: "Could not add", description: e.message, variant: "destructive" }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-services", business?.id] });
      toast({ title: "Removed" });
    },
  });

  return (
    <BusinessLayout>
      <PageHeader eyebrow="Catalog" title="Services & products" description="Anything you sell — name it, price it, publish it." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display text-lg font-bold">Add a new item</h2>
            <div className="space-y-2">
              <Label htmlFor="kind">Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as CatalogKind)}>
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
              <Label htmlFor="title">{kind === "product" ? "Product name" : "Service name"}</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price (ZAR)</Label>
                <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              {kind === "service" && (
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input id="duration" type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} />
            </div>
            {kind === "product" && (
              <div className="space-y-2">
                <Label>Product photo</Label>
                {imageUrl ? (
                  <div className="relative h-40 overflow-hidden rounded-2xl bg-muted">
                    <img src={imageUrl} alt="Product preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 text-foreground shadow-card hover:bg-background"
                      aria-label="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground hover:bg-muted/50">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                    <span>{uploading ? "Uploading…" : "Click to upload (JPG, PNG, WebP · max 5 MB)"}</span>
                    <input
                      type="file"
                      accept={businessImageAccept}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadProductImage(f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            )}
            <div className="rounded-2xl bg-muted/40 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="delivery">Offer delivery</Label>
                  <p className="text-[11px] text-muted-foreground">Charge per kilometre on top of the item price.</p>
                </div>
                <Switch id="delivery" checked={deliveryAvailable} onCheckedChange={setDeliveryAvailable} />
              </div>
              {deliveryAvailable ? (
                <div className="space-y-2">
                  <Label htmlFor="perkm">Delivery price per km (ZAR)</Label>
                  <Input id="perkm" type="number" min={0} step="0.01" value={deliveryPerKm} onChange={(e) => setDeliveryPerKm(e.target.value)} />
                </div>
              ) : null}
            </div>
            <Button className="w-full" onClick={() => create.mutate()} disabled={!title || !price || create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {kind === "product" ? " Add product" : " Add service"}
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
                  const itemKind = ((s as unknown as { kind?: string }).kind ?? "service") as CatalogKind;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.title} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {itemKind === "product" ? "Product" : "Service"}
                          </span>
                          <p className="truncate font-semibold">{s.title}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatPrice(Number(s.price), s.currency)}
                          {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={s.is_active} onCheckedChange={(v) => toggle.mutate({ id: s.id, active: v })} />
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

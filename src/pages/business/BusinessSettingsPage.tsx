import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Image as ImageIcon, Loader2, Lock, Plus, Save, Trash2 } from "lucide-react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AVAILABILITY_LABEL,
  DAY_LABELS,
  type Availability,
  type BusinessHourRow,
  businessImageAccept,
  fetchBusinessHours,
  fetchBusinessSettings,
  fetchMyBusiness,
  fetchMyChangeRequests,
  replaceBusinessHours,
  submitChangeRequest,
  uploadBusinessImage,
  upsertBusinessSettings,
} from "@/lib/business/queries";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

type DraftRange = { id: string; opens_at: string; closes_at: string };
type DraftDay = { is_open: boolean; ranges: DraftRange[] };

const emptyWeek = (): DraftDay[] =>
  Array.from({ length: 7 }, () => ({ is_open: false, ranges: [{ id: crypto.randomUUID(), opens_at: "09:00", closes_at: "17:00" }] }));

const hoursToDraft = (rows: BusinessHourRow[]): DraftDay[] => {
  const draft = emptyWeek();
  for (const r of rows) {
    const day = draft[r.day_of_week];
    if (!day) continue;
    if (!day.is_open) {
      day.is_open = r.is_open;
      day.ranges = [];
    }
    day.ranges.push({ id: crypto.randomUUID(), opens_at: r.opens_at.slice(0, 5), closes_at: r.closes_at.slice(0, 5) });
  }
  for (const day of draft) {
    if (day.ranges.length === 0) day.ranges = [{ id: crypto.randomUUID(), opens_at: "09:00", closes_at: "17:00" }];
  }
  return draft;
};

const draftToRows = (draft: DraftDay[]) =>
  draft.flatMap((day, dow) =>
    day.is_open
      ? day.ranges.map((r) => ({ day_of_week: dow, opens_at: `${r.opens_at}:00`, closes_at: `${r.closes_at}:00`, is_open: true }))
      : [],
  );

const BusinessSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const { data: business, isLoading } = useQuery({
    queryKey: ["my-business", userId],
    queryFn: () => fetchMyBusiness(userId),
    enabled: !!userId,
  });

  const businessId = business?.id ?? "";

  const { data: settings } = useQuery({
    queryKey: ["business-settings", businessId],
    queryFn: () => fetchBusinessSettings(businessId),
    enabled: !!businessId,
  });

  const { data: hours = [] } = useQuery({
    queryKey: ["business-hours", businessId],
    queryFn: () => fetchBusinessHours(businessId),
    enabled: !!businessId,
  });

  const { data: changeRequests = [] } = useQuery({
    queryKey: ["change-requests", businessId],
    queryFn: () => fetchMyChangeRequests(businessId),
    enabled: !!businessId,
  });

  const [form, setForm] = useState({
    name: "",
    slug: "",
    tagline: "",
    description: "",
    category: "",
    phone: "",
    email: "",
    city: "",
    country: "South Africa",
    is_published: false,
    logo_url: "" as string | null | "",
    cover_url: "" as string | null | "",
    availability: "available" as Availability,
    away_until: "" as string,
  });

  const [week, setWeek] = useState<DraftDay[]>(emptyWeek);
  const [requestField, setRequestField] = useState<null | "name" | "phone" | "email">(null);
  const [requestValue, setRequestValue] = useState("");
  const [requestReason, setRequestReason] = useState("");

  useEffect(() => {
    if (business) {
      setForm((f) => ({
        ...f,
        name: business.name ?? "",
        slug: business.slug ?? "",
        tagline: business.tagline ?? "",
        description: business.description ?? "",
        category: business.category ?? "",
        phone: business.phone ?? "",
        email: business.email ?? "",
        city: business.city ?? "",
        country: business.country ?? "South Africa",
        is_published: business.is_published,
        logo_url: business.logo_url ?? "",
      }));
    }
  }, [business]);

  useEffect(() => {
    if (settings) {
      setForm((f) => ({
        ...f,
        cover_url: settings.cover_url ?? "",
        availability: settings.availability,
        away_until: settings.away_until ? settings.away_until.slice(0, 10) : "",
      }));
    }
  }, [settings]);

  useEffect(() => {
    setWeek(hoursToDraft(hours));
  }, [hours]);

  const pendingByField = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const r of changeRequests) if (r.status === "pending") m[r.field] = true;
    return m;
  }, [changeRequests]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      // Editable business fields only — locked fields go through change-requests.
      const editable = {
        slug: form.slug || slugify(form.name),
        tagline: form.tagline,
        description: form.description,
        category: form.category,
        city: form.city,
        country: form.country,
        is_published: form.is_published,
        logo_url: form.logo_url || null,
      };
      if (business) {
        const { error } = await supabase.from("businesses").update(editable).eq("id", business.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("businesses").insert({
          ...editable,
          name: form.name,
          phone: form.phone,
          email: form.email,
          owner_id: user.id,
        });
        if (error) throw error;
      }

      if (business) {
        await upsertBusinessSettings(business.id, {
          availability: form.availability,
          away_until: form.away_until ? new Date(form.away_until).toISOString() : null,
          cover_url: form.cover_url || null,
        });
        await replaceBusinessHours(business.id, draftToRows(week));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-business", userId] });
      qc.invalidateQueries({ queryKey: ["business-settings", businessId] });
      qc.invalidateQueries({ queryKey: ["business-hours", businessId] });
      toast({ title: "Saved" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!user || !business || !requestField) return;
      const current =
        requestField === "name" ? business.name : requestField === "phone" ? (business.phone ?? "") : (business.email ?? "");
      await submitChangeRequest({
        business_id: business.id,
        submitted_by: user.id,
        field: requestField,
        current_value: current,
        requested_value: requestValue.trim(),
        reason: requestReason.trim() || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Request sent", description: "An admin will review it shortly." });
      setRequestField(null);
      setRequestValue("");
      setRequestReason("");
      qc.invalidateQueries({ queryKey: ["change-requests", businessId] });
    },
    onError: (e: Error) => toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  const onUpload = async (file: File, kind: "logo" | "cover") => {
    if (!business) {
      toast({ title: "Save your business first", variant: "destructive" });
      return;
    }
    try {
      const url = await uploadBusinessImage(business.id, file, kind);
      setForm((f) => ({ ...f, [kind === "logo" ? "logo_url" : "cover_url"]: url }));
      toast({ title: kind === "logo" ? "Logo uploaded" : "Cover uploaded" });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const updateRange = (dow: number, rangeId: string, key: "opens_at" | "closes_at", value: string) =>
    setWeek((w) => w.map((d, i) => (i === dow ? { ...d, ranges: d.ranges.map((r) => (r.id === rangeId ? { ...r, [key]: value } : r)) } : d)));
  const addRange = (dow: number) =>
    setWeek((w) => w.map((d, i) => (i === dow ? { ...d, ranges: [...d.ranges, { id: crypto.randomUUID(), opens_at: "09:00", closes_at: "17:00" }] } : d)));
  const removeRange = (dow: number, rangeId: string) =>
    setWeek((w) => w.map((d, i) => (i === dow ? { ...d, ranges: d.ranges.filter((r) => r.id !== rangeId) } : d)));
  const toggleDay = (dow: number, value: boolean) => setWeek((w) => w.map((d, i) => (i === dow ? { ...d, is_open: value } : d)));

  if (isLoading) {
    return (
      <BusinessLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </BusinessLayout>
    );
  }

  const lockedField = (label: string, value: string, field: "name" | "phone" | "email") => {
    const pending = pendingByField[field];
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> {label}
          </Label>
          {pending ? (
            <Badge variant="secondary" className="text-[10px]">
              Pending review
            </Badge>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Input value={value} disabled className="bg-muted/40" />
          <Button
            type="button"
            variant="secondary"
            disabled={!business || pending}
            onClick={() => {
              setRequestField(field);
              setRequestValue(value);
              setRequestReason("");
            }}
          >
            Request change
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {pending ? "An admin is reviewing your last request." : "Locked for security. Submit a change request and an admin will review it."}
        </p>
      </div>
    );
  };

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow="Profile"
        title="Business profile & settings"
        description="Customers see this when they browse or order from you."
      />

      {/* Branding */}
      <Card className="rounded-3xl border-0 shadow-card">
        <CardContent className="space-y-5 p-5">
          <div>
            <h2 className="font-display text-base font-bold">Branding</h2>
            <p className="text-xs text-muted-foreground">Your logo and cover photo show up on your public profile.</p>
          </div>

          <div className="overflow-hidden rounded-2xl bg-muted">
            <div
              className="relative h-36 w-full bg-gradient-to-br from-foreground/30 to-muted bg-cover bg-center md:h-48"
              style={form.cover_url ? { backgroundImage: `url(${form.cover_url})` } : undefined}
            >
              <label className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-card hover:bg-background">
                <Camera className="h-3.5 w-3.5" /> Change cover
                <input
                  type="file"
                  accept={businessImageAccept}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f, "cover");
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <div className="flex items-end gap-4 p-4">
              <div className="-mt-12 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-foreground text-lg font-bold text-background ring-4 ring-card">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  (form.name || "BO").slice(0, 2).toUpperCase()
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background hover:bg-foreground/90">
                <ImageIcon className="h-3.5 w-3.5" /> Upload logo
                <input
                  type="file"
                  accept={businessImageAccept}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f, "logo");
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile details */}
      <Card className="mt-5 rounded-3xl border-0 shadow-card">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          {lockedField("Business name", form.name, "name")}
          <div className="space-y-2">
            <Label htmlFor="slug">Public link slug</Label>
            <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} maxLength={60} />
          </div>
          {lockedField("Phone", form.phone, "phone")}
          {lockedField("Public email", form.email, "email")}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} maxLength={140} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="desc">About</Label>
            <Textarea
              id="desc"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={1200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-muted p-3 md:col-span-2">
            <div>
              <p className="font-semibold">Published</p>
              <p className="text-xs text-muted-foreground">Customers can find and order from you when this is on.</p>
            </div>
            <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card className="mt-5 rounded-3xl border-0 shadow-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-base font-bold">Availability</h2>
            <p className="text-xs text-muted-foreground">A live status badge shown next to your name on the customer side.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Current status</Label>
              <Select value={form.availability} onValueChange={(v) => setForm({ ...form, availability: v as Availability })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => (
                    <SelectItem key={a} value={a}>
                      {AVAILABILITY_LABEL[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.availability === "away" && (
              <div className="space-y-2">
                <Label htmlFor="away_until">Back on</Label>
                <Input
                  id="away_until"
                  type="date"
                  value={form.away_until}
                  onChange={(e) => setForm({ ...form, away_until: e.target.value })}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card className="mt-5 rounded-3xl border-0 shadow-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-base font-bold">Weekly hours</h2>
            <p className="text-xs text-muted-foreground">Add one or more time ranges per day. Customers see this on your profile.</p>
          </div>
          <div className="space-y-3">
            {DAY_LABELS.map((label, dow) => {
              const day = week[dow];
              return (
                <div key={label} className="rounded-2xl bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{label}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{day.is_open ? "Open" : "Closed"}</span>
                      <Switch checked={day.is_open} onCheckedChange={(v) => toggleDay(dow, v)} />
                    </div>
                  </div>
                  {day.is_open && (
                    <div className="mt-3 space-y-2">
                      {day.ranges.map((r) => (
                        <div key={r.id} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={r.opens_at}
                            onChange={(e) => updateRange(dow, r.id, "opens_at", e.target.value)}
                            className="max-w-[140px]"
                          />
                          <span className="text-xs text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={r.closes_at}
                            onChange={(e) => updateRange(dow, r.id, "closes_at", e.target.value)}
                            className="max-w-[140px]"
                          />
                          {day.ranges.length > 1 && (
                            <Button type="button" variant="secondary" size="icon" onClick={() => removeRange(dow, r.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="secondary" size="sm" onClick={() => addRange(dow)}>
                        <Plus className="h-3.5 w-3.5" /> Add range
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mt-5">
        <Button className="w-full md:w-auto" onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </Button>
      </div>

      {/* Change-request dialog */}
      <Dialog open={!!requestField} onOpenChange={(o) => !o && setRequestField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request change to {requestField}</DialogTitle>
            <DialogDescription>
              An admin will review your request before it's applied. You'll get a notification with the decision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>New {requestField}</Label>
              <Input value={requestValue} onChange={(e) => setRequestValue(e.target.value)} maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea value={requestReason} onChange={(e) => setRequestReason(e.target.value)} maxLength={500} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRequestField(null)}>
              Cancel
            </Button>
            <Button onClick={() => submitRequest.mutate()} disabled={submitRequest.isPending || requestValue.trim().length < 2}>
              {submitRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessLayout>
  );
};

export { BusinessSettingsPage };
export default BusinessSettingsPage;

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyBusiness } from "@/lib/business/queries";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

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
  });

  useEffect(() => {
    if (business) {
      setForm({
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
      });
    }
  }, [business]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const payload = { ...form, slug: form.slug || slugify(form.name), owner_id: user.id };
      if (business) {
        const { error } = await supabase.from("businesses").update(payload).eq("id", business.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("businesses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-business", userId] });
      toast({ title: "Saved" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <BusinessLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow="Profile"
        title="Business profile & settings"
        description="Customers see this when they browse or order from you."
      />

      <Card className="rounded-3xl border-0 shadow-card">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Public link slug</Label>
            <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} maxLength={60} />
          </div>
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
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Public email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
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
          <div className="md:col-span-2">
            <Button className="w-full md:w-auto" onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </BusinessLayout>
  );
};

export { BusinessSettingsPage };
export default BusinessSettingsPage;

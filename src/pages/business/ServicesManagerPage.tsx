import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { fetchBusinessServices, fetchMyBusiness, formatPrice, type Service } from "@/lib/business/queries";

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

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("Create your business profile first");
      const { error } = await supabase.from("services").insert({
        business_id: business.id,
        title,
        description: description || null,
        price: Number(price) || 0,
        duration_minutes: duration ? Number(duration) : null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setPrice("");
      setDuration("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["business-services", business?.id] });
      toast({ title: "Service added" });
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
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price (ZAR)</Label>
                <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input id="duration" type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} />
            </div>
            <Button className="w-full" onClick={() => create.mutate()} disabled={!title || !price || create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add service
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display text-lg font-bold">Your catalog ({services.length})</h2>
            {services.length === 0 ? (
              <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
                Add your first service to start receiving orders.
              </p>
            ) : (
              <ul className="space-y-2">
                {services.map((s: Service) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
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
                ))}
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

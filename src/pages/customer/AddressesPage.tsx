import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { z } from "zod";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyAddresses } from "@/lib/customer/queries";

const addressSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(40),
  recipient: z.string().trim().min(1, "Recipient is required").max(80),
  line1: z.string().trim().min(2, "Address line is required").max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(80),
  postal_code: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(20).optional(),
});

const AddressesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["my-addresses", user?.id],
    queryFn: () => fetchMyAddresses(user?.id as string),
    enabled: !!user?.id,
  });

  const create = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      if (!user) throw new Error("Not signed in");
      const fd = new FormData(form);
      const parsed = addressSchema.safeParse({
        label: String(fd.get("label") ?? ""),
        recipient: String(fd.get("recipient") ?? ""),
        line1: String(fd.get("line1") ?? ""),
        line2: String(fd.get("line2") ?? "") || undefined,
        city: String(fd.get("city") ?? ""),
        postal_code: String(fd.get("postal_code") ?? "") || undefined,
        phone: String(fd.get("phone") ?? "") || undefined,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      const { error } = await supabase.from("addresses").insert([{
        ...parsed.data,
        user_id: user.id,
        is_default: addresses.length === 0,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Address saved" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-addresses", user?.id] });
    },
    onError: (e) => toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-addresses", user?.id] });
      toast({ title: "Address removed" });
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not signed in");
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-addresses", user?.id] }),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    create.mutate(e.currentTarget);
  };

  return (
    <CustomerLayout>
      <PageHeader
        eyebrow="Delivery"
        title="Saved addresses"
        description="Add the spots you order to most — pick one in checkout with a tap."
        action={
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus className="h-4 w-4" /> {open ? "Close" : "New address"}
          </Button>
        }
      />

      {open ? (
        <form onSubmit={onSubmit} className="mb-5 grid gap-3 rounded-3xl bg-card p-5 shadow-card sm:grid-cols-2">
          <Field name="label" label="Label" placeholder="Home, office…" required maxLength={40} />
          <Field name="recipient" label="Recipient" placeholder="Full name" required maxLength={80} />
          <Field name="line1" label="Address line 1" placeholder="Street and number" required className="sm:col-span-2" maxLength={120} />
          <Field name="line2" label="Address line 2" placeholder="Suite, floor (optional)" className="sm:col-span-2" maxLength={120} />
          <Field name="city" label="City" required maxLength={80} />
          <Field name="postal_code" label="Postal code" maxLength={20} />
          <Field name="phone" label="Phone" type="tel" maxLength={20} className="sm:col-span-2" />
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" size="lg" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save address"}
            </Button>
          </div>
        </form>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-card shadow-card" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="grid place-items-center rounded-3xl bg-card p-10 text-center shadow-card">
          <MapPin className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-bold">No addresses yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add one to make ordering faster.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-2xl bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-bold">{a.label}</p>
                    {a.is_default ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background">
                        <Star className="h-3 w-3 fill-current" /> Default
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.recipient}</p>
                  <p className="mt-1 text-sm">
                    {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}
                    {a.postal_code ? ` · ${a.postal_code}` : ""}
                  </p>
                  {a.phone ? <p className="mt-1 text-xs text-muted-foreground">{a.phone}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(a.id)}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-destructive hover:bg-destructive/15"
                  aria-label="Remove address"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {!a.is_default ? (
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => setDefault.mutate(a.id)}>
                  Make default
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </CustomerLayout>
  );
};

const Field = ({
  name,
  label,
  type = "text",
  placeholder,
  required,
  maxLength,
  className,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
}) => (
  <div className={`space-y-2 ${className ?? ""}`}>
    <Label htmlFor={name}>{label}</Label>
    <Input
      id={name}
      name={name}
      type={type}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      className="h-11 rounded-2xl border-0 bg-muted"
    />
  </div>
);

export { AddressesPage };
export default AddressesPage;

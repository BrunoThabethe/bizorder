import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long"),
  email: z.string().trim().email("Enter a valid email").max(160, "Email is too long"),
  business: z.string().trim().min(2, "Tell us your business").max(80, "Too long"),
});

export const CtaForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ name: "", email: "", business: "" });

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = leadSchema.safeParse(data);
    if (!result.success) {
      toast({
        title: "Check your details",
        description: result.error.issues[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    toast({
      title: "You're in!",
      description: "We'll reach out within 24 hours to get you live.",
    });
    setData({ name: "", email: "", business: "" });
  };

  return (
    <section id="signup" className="relative py-20 md:py-28">
      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border/60 bg-card-gradient p-8 shadow-card-lift md:p-12">
          <div className="text-center">
            <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              Get started — free
            </span>
            <h2 className="mt-5 font-display text-3xl font-bold md:text-5xl">
              Ready to <span className="text-primary">stop losing sales?</span>
            </h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Tell us about your business. We'll get you live in 24 hours.
            </p>
          </div>

          <form onSubmit={handle} className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-1">
              <Label htmlFor="name" className="text-sm font-semibold">Your name</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                maxLength={80}
                placeholder="Lerato Moloi"
                className="mt-1.5 h-12 border-0 bg-background/50"
                required
              />
            </div>

            <div className="md:col-span-1">
              <Label htmlFor="business" className="text-sm font-semibold">Business name</Label>
              <Input
                id="business"
                value={data.business}
                onChange={(e) => setData({ ...data, business: e.target.value })}
                maxLength={80}
                placeholder="Lerato's Bakery"
                className="mt-1.5 h-12 border-0 bg-background/50"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                maxLength={160}
                placeholder="you@business.com"
                className="mt-1.5 h-12 border-0 bg-background/50"
                required
              />
            </div>

            <Button type="submit" size="xl" disabled={loading} className="md:col-span-2">
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Setting you up...
                </>
              ) : (
                <>
                  Claim my free account <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground md:col-span-2">
              No credit card. No spam. Cancel anytime.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

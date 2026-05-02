import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Eye, EyeOff, Loader2, ShoppingBag, Zap } from "lucide-react";
import { z } from "zod";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Role = "customer" | "business";

const baseSchema = z.object({
  fullName: z.string().trim().min(2, "Tell us your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  password: z.string().min(8, "At least 8 characters").max(128),
});

const businessExtras = z.object({
  businessName: z.string().trim().min(2, "Add your business name").max(120),
  category: z.string().trim().min(2, "Pick a category, e.g. Bakery").max(60),
  address: z.string().trim().min(5, "Add your trading address").max(240),
});

const roleOptions: { id: Role; title: string; text: string; icon: typeof ShoppingBag }[] = [
  { id: "customer", title: "I'm a customer", text: "I want to order from local businesses.", icon: ShoppingBag },
  { id: "business", title: "I'm a business", text: "I want to take orders from customers.", icon: Briefcase },
];

const SignupPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "");
    const email = String(form.get("email") ?? "");
    const phone = String(form.get("phone") ?? "");
    const password = String(form.get("password") ?? "");

    const baseParsed = baseSchema.safeParse({ fullName, email, phone, password });
    if (!baseParsed.success) {
      toast({
        title: "Check your details",
        description: baseParsed.error.issues[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }

    let businessName: string | null = null;
    let category: string | null = null;
    let address: string | null = null;

    if (role === "business") {
      const businessParsed = businessExtras.safeParse({
        businessName: String(form.get("businessName") ?? ""),
        category: String(form.get("category") ?? ""),
        address: String(form.get("address") ?? ""),
      });
      if (!businessParsed.success) {
        toast({
          title: "Finish your business details",
          description: businessParsed.error.issues[0]?.message ?? "Invalid input",
          variant: "destructive",
        });
        return;
      }
      businessName = businessParsed.data.businessName;
      category = businessParsed.data.category;
      address = businessParsed.data.address;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          phone,
          role,
          business_name: businessName,
          business_category: category,
          business_address: address,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Welcome to BizOrder",
      description:
        role === "business"
          ? "Account created. Next step: upload your verification documents."
          : "Account created.",
    });
    navigate(role === "business" ? "/business/onboarding" : "/");
  };

  return (
    <SiteLayout>
      <section className="relative flex min-h-screen items-center justify-center px-4 pt-32 pb-16 md:pt-40">
        <div className="w-full max-w-2xl rounded-2xl bg-background/40 p-7 backdrop-blur-md md:p-10">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground">
              <Zap className="h-5 w-5 text-background" strokeWidth={2.5} />
            </span>
            <span className="font-display text-xl font-bold">BizOrder</span>
          </Link>

          <h1 className="mt-6 font-display text-3xl font-bold md:text-4xl">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Free to start. Pick how you'll use BizOrder — you can switch later.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {roleOptions.map((opt) => {
              const active = role === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRole(opt.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl p-4 text-left transition-all",
                    active
                      ? "bg-foreground text-background shadow-card-lift"
                      : "bg-foreground/5 text-foreground hover:bg-foreground/10",
                  )}
                >
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                      active ? "bg-background/15" : "bg-foreground/10",
                    )}
                  >
                    <opt.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold">{opt.title}</p>
                    <p className={cn("mt-1 text-xs", active ? "text-background/80" : "text-muted-foreground")}>
                      {opt.text}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {role === "business" && (
            <div className="mt-5 rounded-xl bg-foreground/5 p-4 text-sm">
              <p className="font-display font-bold">What happens after signup</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload these to verify your business and unlock your portal:
              </p>
              <ul className="mt-2 grid gap-1 text-xs text-foreground/90">
                <li>• Owner ID (SA ID or passport)</li>
                <li>• Proof of residence (utility bill or bank letter)</li>
                <li>• Proof of operations (premises photo, signage, or invoice)</li>
                <li>• CIPC registration (optional)</li>
              </ul>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">{role === "business" ? "Owner full name" : "Full name"}</Label>
                <Input id="fullName" name="fullName" placeholder="Sarah Mokoena" required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{role === "business" ? "Business phone" : "Phone"}</Label>
                <Input id="phone" name="phone" type="tel" placeholder="+27 60 000 0000" required maxLength={20} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{role === "business" ? "Business email" : "Email"}</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required maxLength={255} autoComplete="email" />
            </div>

            {role === "business" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business name</Label>
                    <Input id="businessName" name="businessName" placeholder="Sarah's Bakery" required maxLength={120} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Type of business</Label>
                    <Input id="category" name="category" placeholder="Bakery, plumber, hair salon…" required maxLength={60} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Business address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    placeholder="123 Main Street, Soweto, Johannesburg"
                    required
                    maxLength={240}
                    rows={2}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              By creating an account you agree to our{" "}
              <Link to="/terms" className="font-semibold text-foreground underline-offset-4 hover:underline">Terms</Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-semibold text-foreground underline-offset-4 hover:underline">Privacy policy</Link>.
            </p>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
};

export { SignupPage };
export default SignupPage;

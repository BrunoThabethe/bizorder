import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Info, Loader2, Sparkles, Zap } from "lucide-react";
import { z } from "zod";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyBusiness } from "@/lib/business/queries";
import { isBusinessFullyVerified } from "@/lib/business/onboarding";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(128),
});

const TEST_PASSWORD = "Test1234!";

type SeedRole = "customer" | "business";
type FinalRole = "customer" | "business" | "crew" | "admin";

const testAccounts: {
  role: string;
  email: string;
  signupRole: SeedRole;
  finalRole: FinalRole;
  fullName: string;
  color: string;
}[] = [
  { role: "Customer", email: "customer@test.bizorder", signupRole: "customer", finalRole: "customer", fullName: "Test Customer", color: "bg-foreground/10" },
  { role: "Business", email: "provider@test.bizorder", signupRole: "business", finalRole: "business", fullName: "Test Provider", color: "bg-foreground/15" },
  { role: "Crew", email: "crew@test.bizorder", signupRole: "customer", finalRole: "crew", fullName: "Test Crew", color: "bg-foreground/10" },
  { role: "Admin", email: "admin@test.bizorder", signupRole: "customer", finalRole: "admin", fullName: "Test Admin", color: "bg-foreground/15" },
];

const roleHomeFor = async (role: string | null | undefined, userId: string) => {
  if (role === "admin") return "/admin";
  if (role === "business") {
    const business = await fetchMyBusiness(userId);
    if (!business) return "/business/onboarding";
    const verified = await isBusinessFullyVerified(business.id);
    return verified ? "/business" : "/business/onboarding";
  }
  if (role === "crew") return "/crew";
  return "/customer";
};

const LoginPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast({
        title: "Check your details",
        description: parsed.error.issues[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      toast({ title: "Sign in failed", description: error?.message ?? "Try again", variant: "destructive" });
      return;
    }

    // Self-heal: promote seed accounts to their intended role on sign-in.
    if (data.user.email === "crew@test.bizorder") {
      await supabase.rpc("promote_test_crew");
    } else if (data.user.email === "admin@test.bizorder") {
      await supabase.rpc("promote_test_admin");
    }

    const { data: roleData } = await supabase.rpc("get_primary_role", { _user_id: data.user.id });
    setLoading(false);
    toast({ title: "Welcome back", description: "You're signed in." });
    const nextRoute = await roleHomeFor(roleData as string | null, data.user.id);
    navigate(nextRoute);
  };

  const fillTestAccount = (testEmail: string) => {
    setEmail(testEmail);
    setPassword(TEST_PASSWORD);
  };

  const seedTestAccounts = async () => {
    setSeeding(true);
    let created = 0;
    let existed = 0;
    for (const acc of testAccounts) {
      const { error } = await supabase.auth.signUp({
        email: acc.email,
        password: TEST_PASSWORD,
        options: {
          data: {
            full_name: acc.fullName,
            business_name: acc.signupRole === "business" ? acc.fullName : null,
            role: acc.signupRole,
          },
        },
      });
      if (!error) created += 1;
      else if (/registered|exists/i.test(error.message)) existed += 1;
    }
    // Sign back out — signUp leaves the last account signed in.
    await supabase.auth.signOut();
    setSeeding(false);
    toast({
      title: "Test accounts ready",
      description: `${created} created, ${existed} already existed. Password: ${TEST_PASSWORD}`,
    });
  };

  return (
    <SiteLayout>
      <section className="relative flex min-h-screen items-center justify-center px-4 pt-32 pb-16 md:pt-40">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl bg-background/40 p-7 backdrop-blur-md md:p-10">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground">
                <Zap className="h-5 w-5 text-background" strokeWidth={2.5} />
              </span>
              <span className="font-display text-xl font-bold">BizOrder</span>
            </Link>

            <h1 className="mt-6 font-display text-3xl font-bold md:text-4xl">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to manage your orders, business, or crew.
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-foreground underline-offset-4 hover:underline">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="current-password"
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

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              New to BizOrder?{" "}
              <Link to="/signup" className="font-semibold text-foreground underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
          </div>

          <div className="rounded-2xl bg-background/30 p-7 backdrop-blur-md md:p-8">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-foreground">
                Dev preview
              </span>
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold">Test accounts</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap any role to auto-fill, then sign in. First time? Create them in one click.
            </p>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4 w-full"
              onClick={seedTestAccounts}
              disabled={seeding}
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Create test accounts
                </>
              )}
            </Button>

            <ul className="mt-4 space-y-2">
              {testAccounts.map((acc) => (
                <li key={acc.email}>
                  <button
                    type="button"
                    onClick={() => fillTestAccount(acc.email)}
                    className={`group flex w-full items-center justify-between rounded-xl ${acc.color} px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:bg-foreground/20`}
                  >
                    <div>
                      <p className="font-display text-sm font-bold">{acc.role}</p>
                      <p className="text-xs text-muted-foreground">{acc.email}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex gap-2 rounded-xl bg-foreground/5 p-4 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <p>
                Password: <span className="font-mono font-semibold text-foreground">Test1234!</span>. Email confirmation may need to be turned off in Supabase Auth for instant sign in.
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

export { LoginPage };
export default LoginPage;

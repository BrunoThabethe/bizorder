import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PENDING_SIGNUP_KEY } from "@/pages/SignupPage";

type PendingSignup = {
  email: string;
  password: string;
  payload: {
    full_name: string;
    phone: string;
    role: "customer" | "business";
    business_name: string | null;
    business_category: string | null;
    business_address: string | null;
    marketing_opt_in: boolean;
  };
};

const readPending = (): PendingSignup | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSignup;
  } catch {
    return null;
  }
};

const VerifyEmailPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const pending = readPending();
    if (!pending || pending.email.toLowerCase() !== email.toLowerCase()) {
      toast({
        title: "Session expired",
        description: "Please start the signup again so we can verify your email.",
        variant: "destructive",
      });
      navigate("/signup", { replace: true });
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Check your code", description: "Enter the 6-digit code.", variant: "destructive" });
      return;
    }

    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("signup-otp", {
      body: {
        action: "verify",
        email: pending.email,
        password: pending.password,
        code,
        payload: pending.payload,
      },
    });

    if (error || (data && (data as { error?: string }).error)) {
      setVerifying(false);
      const msg = (data as { error?: string } | null)?.error ?? error?.message ?? "Verification failed";
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
      return;
    }

    const role = (data as { role?: "customer" | "business" })?.role ?? pending.payload.role;

    // Sign the new user in.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: pending.email,
      password: pending.password,
    });
    setVerifying(false);

    try {
      sessionStorage.removeItem(PENDING_SIGNUP_KEY);
    } catch {
      // ignore
    }

    if (signInError) {
      toast({
        title: "Account ready",
        description: "Please sign in to continue.",
      });
      navigate("/login", { replace: true });
      return;
    }

    toast({ title: "Email verified", description: "Welcome to BizOrder." });
    if (role === "business") {
      navigate("/business/onboarding", { replace: true });
    } else {
      navigate("/customer/dashboard", { replace: true });
    }
  };

  const resend = async () => {
    const pending = readPending();
    if (!pending || !email) {
      toast({
        title: "Session expired",
        description: "Please start the signup again so we can send you a new code.",
        variant: "destructive",
      });
      navigate("/signup", { replace: true });
      return;
    }
    setResending(true);
    const { data, error } = await supabase.functions.invoke("signup-otp", {
      body: { action: "request", email: pending.email },
    });
    setResending(false);
    if (error || (data && (data as { error?: string }).error)) {
      const msg = (data as { error?: string } | null)?.error ?? error?.message ?? "Could not resend";
      toast({ title: "Could not resend", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "New code sent", description: "Check your inbox." });
  };

  return (
    <SiteLayout>
      <section className="flex min-h-screen items-center justify-center px-4 pt-32 pb-16">
        <div className="w-full max-w-md rounded-2xl bg-background/40 p-8 backdrop-blur-md">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-foreground">
            <MailCheck className="h-6 w-6 text-background" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We emailed a 6-digit code. Enter it below to activate your account.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em]"
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={verifying}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify email <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <Button type="button" variant="secondary" size="sm" className="mt-4 w-full" onClick={resend} disabled={resending}>
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend code"}
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already verified?{" "}
            <Link to="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">Sign in</Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
};

export { VerifyEmailPage };
export default VerifyEmailPage;

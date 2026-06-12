import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
    if (!email || !/^\d{6}$/.test(code)) {
      toast({ title: "Check your details", description: "Enter your email and the 6-digit code.", variant: "destructive" });
      return;
    }
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
    setVerifying(false);
    if (error) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Email verified", description: "Welcome to BizOrder." });
    navigate("/login", { replace: true });
  };

  const resend = async () => {
    if (!email) {
      toast({ title: "Add your email", description: "Enter the email you signed up with.", variant: "destructive" });
      return;
    }
    setResending(true);
    const { data, error } = await supabase.functions.invoke("signup-otp", {
      body: { action: "resend", email },
    });
    setResending(false);
    const errMsg = (data as { error?: string } | null)?.error ?? error?.message;
    if (errMsg) {
      toast({ title: "Could not resend", description: errMsg, variant: "destructive" });
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

import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { z } from "zod";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast({ title: "Check your email", description: parsed.error.issues[0]?.message ?? "Invalid email", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    // Always show success to avoid leaking whether the email exists.
    setSent(true);
    if (error) {
      // Soft-log via toast for transient transport errors only — keep account-existence neutral.
      toast({ title: "If that email exists, we sent a reset link." });
    }
  };

  return (
    <SiteLayout>
      <section className="relative flex min-h-screen items-center justify-center px-4 pt-32 pb-16 md:pt-40">
        <div className="w-full max-w-md rounded-2xl bg-background/40 p-7 backdrop-blur-md md:p-10">
          <Link to="/" className="inline-flex items-center gap-2">
            <BrandMark size={40} />
            <span className="font-display text-xl font-bold">BizOrder</span>
          </Link>

          {sent ? (
            <div className="mt-8 space-y-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
                <MailCheck className="h-6 w-6" />
              </div>
              <h1 className="font-display text-3xl font-bold">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="font-semibold text-foreground">{email}</span>, you'll get a
                reset link in the next few minutes. Open it on this device to set a new password.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Back to sign in <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="mt-6 font-display text-3xl font-bold md:text-4xl">Forgot your password?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter the email on your account. We'll send a secure link to reset your password.
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
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Send reset link <ArrowRight className="h-4 w-4" /></>)}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link to="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};

export default ForgotPasswordPage;

import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters").max(128),
    confirm: z.string().min(8).max(128),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase recovery flow: a session is created from the URL hash automatically.
    // We just confirm a session exists before allowing a password update.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
    };
    void check();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast({
        title: "Check your password",
        description: parsed.error.issues[0]?.message ?? "Invalid password",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't update password", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "You're signed in with your new password." });
    navigate("/login", { replace: true });
  };

  return (
    <SiteLayout>
      <section className="relative flex min-h-screen items-center justify-center px-4 pt-32 pb-16 md:pt-40">
        <div className="w-full max-w-md rounded-2xl bg-background/40 p-7 backdrop-blur-md md:p-10">
          <Link to="/" className="inline-flex items-center gap-2">
            <BrandMark size={40} />
            <span className="font-display text-xl font-bold">BizOrder</span>
          </Link>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure reset
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a strong password — at least 8 characters. We'll save it securely and sign you in.
          </p>

          {!ready ? (
            <p className="mt-7 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              This page only works from the reset link in your email. Open the link on this device, or{" "}
              <Link to="/forgot-password" className="font-semibold text-foreground underline-offset-4 hover:underline">
                request a new one
              </Link>
              .
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Update password <ArrowRight className="h-4 w-4" /></>)}
              </Button>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};

export default ResetPasswordPage;

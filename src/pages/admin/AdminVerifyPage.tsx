import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isAdminOtpVerified, markAdminOtpVerified } from "@/components/admin/AdminOtpGate";

const AdminVerifyPage = () => {
  const { session, role, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  const requestCode = async () => {
    setSending(true);
    const { error } = await supabase.functions.invoke("admin-otp", { body: { action: "request" } });
    setSending(false);
    if (error) {
      toast({ title: "Could not send code", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
    toast({ title: "Code sent", description: "Check your inbox for the 6-digit code." });
  };

  useEffect(() => {
    if (!loading && session && role === "admin" && !sent && !isAdminOtpVerified(session.user.id)) {
      void requestCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, role]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session || role !== "admin") return <Navigate to="/login" replace />;
  if (isAdminOtpVerified(session.user.id)) return <Navigate to="/admin" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code.", variant: "destructive" });
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("admin-otp", {
      body: { action: "verify", code },
    });
    setVerifying(false);
    if (error || !data?.ok) {
      toast({ title: "Verification failed", description: error?.message ?? "Invalid or expired code.", variant: "destructive" });
      return;
    }
    markAdminOtpVerified(session.user.id);
    toast({ title: "Verified", description: "Welcome to the admin portal." });
    navigate("/admin", { replace: true });
  };

  return (
    <SiteLayout>
      <section className="flex min-h-screen items-center justify-center px-4 pt-32 pb-16">
        <div className="w-full max-w-md rounded-2xl bg-background/40 p-8 backdrop-blur-md">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-foreground">
            <ShieldCheck className="h-6 w-6 text-background" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold">Admin verification</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We emailed a 6-digit code to <span className="font-semibold text-foreground">{session.user.email}</span>. Enter it to finish signing in.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                autoFocus
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={verifying}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4 w-full"
            onClick={requestCode}
            disabled={sending}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend code"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login", { replace: true });
            }}
          >
            Cancel and sign out
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
};

export { AdminVerifyPage };
export default AdminVerifyPage;

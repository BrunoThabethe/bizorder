import { useState, FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type OtpResponse = { ok?: boolean; error?: string; new_email?: string };

const getFnError = async (error: unknown): Promise<string> => {
  if (error && typeof error === "object" && "context" in error) {
    const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
    const body = await ctx?.json?.().catch(() => null);
    if (body && typeof body === "object" && "error" in body) {
      const m = (body as { error?: unknown }).error;
      if (typeof m === "string") return m;
    }
  }
  if (error instanceof Error) return error.message;
  return "Try again in a moment.";
};

type Props = {
  currentEmail: string | null | undefined;
  onChanged?: (newEmail: string) => void;
};

export const EmailChangeCard = ({ currentEmail, onChanged }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");

  const reset = () => {
    setStep("request");
    setNewEmail("");
    setCode("");
  };

  const requestMut = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke<OtpResponse>("email-change-otp", {
        body: { action: "request", new_email: email },
      });
      if (error) throw new Error(await getFnError(error));
      if (!data?.ok) throw new Error(data?.error ?? "Could not send code");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Code sent", description: `Check ${newEmail} for a 6-digit code.` });
      setStep("verify");
    },
    onError: (e: Error) => toast({ title: "Couldn't send code", description: e.message, variant: "destructive" }),
  });

  const verifyMut = useMutation({
    mutationFn: async (codeInput: string) => {
      const { data, error } = await supabase.functions.invoke<OtpResponse>("email-change-otp", {
        body: { action: "verify", code: codeInput },
      });
      if (error) throw new Error(await getFnError(error));
      if (!data?.ok) throw new Error(data?.error ?? "Invalid or expired code");
      return data;
    },
    onSuccess: async (data) => {
      toast({ title: "Email updated", description: "Sign back in to refresh your session." });
      onChanged?.(data.new_email ?? newEmail);
      setOpen(false);
      reset();
      // Refresh the JWT so the new email is reflected on next request.
      await supabase.auth.refreshSession().catch(() => undefined);
    },
    onError: (e: Error) => toast({ title: "Verification failed", description: e.message, variant: "destructive" }),
  });

  const onRequest = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    requestMut.mutate(newEmail.trim().toLowerCase());
  };

  const onVerify = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code.", variant: "destructive" });
      return;
    }
    verifyMut.mutate(code);
  };

  return (
    <Card className="rounded-3xl border-0 shadow-card">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold">Login email</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              We send sign-in alerts and codes here. Change it to a new address you can access.
            </p>
            <p className="mt-2 text-sm font-semibold">{currentEmail ?? "—"}</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Mail className="h-4 w-4" /> Change email
          </Button>
        </div>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{step === "request" ? "New login email" : "Enter the 6-digit code"}</DialogTitle>
            <DialogDescription>
              {step === "request"
                ? "We'll send a 6-digit code to confirm you can access this address."
                : `We sent a code to ${newEmail}. It expires in 15 minutes.`}
            </DialogDescription>
          </DialogHeader>

          {step === "request" ? (
            <form onSubmit={onRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">New email</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="you@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  maxLength={255}
                  required
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={requestMut.isPending}>
                  {requestMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send code <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={onVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">6-digit code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.5em]"
                  autoFocus
                  required
                />
              </div>
              <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => requestMut.mutate(newEmail.trim().toLowerCase())}
                  disabled={requestMut.isPending}
                >
                  Resend code
                </Button>
                <Button type="submit" disabled={verifyMut.isPending}>
                  {verifyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

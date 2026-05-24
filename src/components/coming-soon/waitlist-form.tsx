import { useState } from "react";
import { ArrowRight, Loader2, PartyPopper } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Enter a valid email")
  .max(160, "Email is too long")
  .email("Enter a valid email");

type Status = "idle" | "submitting" | "done" | "error";

export const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus("error");
      setMessage(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }

    setStatus("submitting");
    const cleanEmail = parsed.data;

    const { error } = await supabase.from("waitlist_signups").insert({
      email: cleanEmail,
      source: "coming_soon",
      user_agent: navigator.userAgent.slice(0, 240),
    });

    if (error && error.code !== "23505") {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      return;
    }

    // Mirror into newsletter_subscribers so it appears in Admin → Newsletter.
    // Silently ignore unique-conflict errors.
    await supabase
      .from("newsletter_subscribers")
      .insert({ email: cleanEmail, source: "coming_soon" });

    // Fire-and-forget welcome email.
    void supabase.functions
      .invoke("send-transactional-email", {
        body: {
          templateName: "waitlist-welcome",
          recipientEmail: cleanEmail,
          idempotencyKey: `waitlist-welcome-${cleanEmail}`,
        },
      })
      .catch(() => undefined);

    setStatus("done");
    setEmail("");
  };

  if (status === "done") {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-primary/30 bg-card-gradient p-6 text-center shadow-card-lift">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
          <PartyPopper className="h-6 w-6" />
        </div>
        <p className="font-display text-xl font-bold text-primary">
          Thank you for joining the pack.
        </p>
        <p className="mt-2 text-sm text-secondary">
          A welcome email is on its way — keep an eye on your inbox for launch news.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card-gradient p-3 shadow-card-lift sm:flex-row sm:items-center">
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          disabled={status === "submitting"}
          required
          maxLength={160}
          autoComplete="email"
          placeholder="you@email.com"
          aria-label="Email address"
          className="h-12 flex-1 border-0 bg-background/80 text-base"
        />
        <Button type="submit" size="lg" disabled={status === "submitting"} className="h-12 shrink-0">
          {status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining…
            </>
          ) : (
            <>
              Notify me <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      {message && (
        <p
          role="status"
          className={cn(
            "mt-3 text-center text-sm",
            status === "error" ? "text-destructive" : "text-primary",
          )}
        >
          {message}
        </p>
      )}
    </form>
  );
};

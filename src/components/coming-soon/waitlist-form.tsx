import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
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
    const { error } = await supabase.from("waitlist_signups").insert({
      email: parsed.data,
      source: "coming_soon",
      user_agent: navigator.userAgent.slice(0, 240),
    });

    if (error) {
      if (error.code === "23505") {
        setStatus("done");
        setMessage("You're already on the list. We'll be in touch soon.");
        return;
      }
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      return;
    }

    setStatus("done");
    setMessage("You're in. Watch your inbox for launch news.");
    setEmail("");
  };

  const isDone = status === "done";

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card-gradient p-3 shadow-card-lift sm:flex-row sm:items-center">
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          disabled={status === "submitting" || isDone}
          required
          maxLength={160}
          autoComplete="email"
          placeholder="you@email.com"
          aria-label="Email address"
          className="h-12 flex-1 border-0 bg-background/60 text-base"
        />
        <Button
          type="submit"
          size="lg"
          disabled={status === "submitting" || isDone}
          className="h-12 shrink-0"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining…
            </>
          ) : isDone ? (
            <>
              <Check className="h-4 w-4" /> You're in
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

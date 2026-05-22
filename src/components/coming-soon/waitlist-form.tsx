import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
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
      <div
        className={cn(
          "group relative flex items-center overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] p-1.5 backdrop-blur-xl transition-all",
          "shadow-[0_8px_40px_-12px_rgba(217,169,87,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
          "focus-within:border-primary/60 focus-within:shadow-[0_8px_60px_-10px_hsl(38_70%_60%/0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)]",
        )}
      >
        {/* Glossy highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/15 to-transparent"
        />
        <input
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
          className="relative z-10 h-12 flex-1 bg-transparent px-4 text-base text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "submitting" || isDone}
          className={cn(
            "relative z-10 inline-flex h-12 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all",
            "bg-cta text-primary-foreground shadow-glow hover:scale-[1.03] active:scale-[0.98]",
            "disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100",
          )}
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
        </button>
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

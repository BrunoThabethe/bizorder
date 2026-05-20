import { useEffect, useState } from "react";
import { Briefcase, CheckCircle2, Inbox, MessageSquare, Sparkles, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "bizorder.business.walkthrough.v2";

const STEPS = [
  {
    icon: Sparkles,
    title: "You're verified — welcome aboard",
    body: "Your documents passed admin review. Here's a quick tour of your provider portal.",
  },
  {
    icon: Inbox,
    title: "Orders queue",
    body: "New customer requests land here. Accept, schedule, and track each job from one screen.",
  },
  {
    icon: Briefcase,
    title: "Your services",
    body: "Add the services and packages you sell, with clear prices customers can book in seconds.",
  },
  {
    icon: MessageSquare,
    title: "Messages & proof",
    body: "Chat with customers, post progress photos, and ask for approval when the work is ready.",
  },
  {
    icon: Wallet,
    title: "Payouts",
    body: "Once a customer confirms a job, your payout is queued for release. Easy to track in Payouts.",
  },
];

type Props = { ownerId: string };

export const BusinessWalkthrough = ({ ownerId }: Props) => {
  const key = `${STORAGE_KEY}:${ownerId}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(key)) setOpen(true);
  }, [key]);

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const Current = STEPS[step].icon;

  const finish = () => {
    localStorage.setItem(key, "1");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-background/80 px-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card p-6 shadow-card-lift sm:p-8">
        <button
          type="button"
          onClick={finish}
          aria-label="Skip walkthrough"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground hover:bg-accent/15 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          key={step}
          className="flex flex-col items-start gap-4 animate-slide-in-right"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-foreground text-background">
            <Current className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold leading-tight">{STEPS[step].title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{STEPS[step].body}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-foreground" : "w-1.5 bg-muted"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button onClick={finish}>
                <CheckCircle2 className="h-4 w-4" /> Let's go
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

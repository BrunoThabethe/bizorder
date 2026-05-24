import { useEffect, useState } from "react";
import { InteractiveDotsBackground } from "@/components/InteractiveDotsBackground";
import { InteractiveLogo } from "./interactive-logo";
import { WaitlistForm } from "./waitlist-form";
import { SocialRow } from "./social-row";
import { HoverVideo } from "./hover-video";
import { PasswordDialog } from "./password-dialog";

export const ComingSoonPage = () => {
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    const onDbl = () => setPwOpen(true);
    window.addEventListener("dblclick", onDbl);
    return () => window.removeEventListener("dblclick", onDbl);
  }, []);

  return (
    <div className="light">
      <div className="relative min-h-screen bg-background text-foreground">
        <InteractiveDotsBackground />

        <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center px-4 pb-16 pt-12 md:pt-20">
          <div className="animate-fade-in">
            <InteractiveLogo size={180} />
          </div>

          <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-primary animate-pulse" />
            Launching soon
          </span>

          <h1 className="mt-5 max-w-3xl text-center font-display text-4xl font-bold leading-[1.05] md:text-6xl">
            Something bold is about to{" "}
            <span className="text-primary">prowl</span> the market.
          </h1>

          <p className="mt-5 max-w-xl text-center text-base text-muted-foreground md:text-lg">
            Be first in line — get the launch date, early-access perks, and a
            head start over the pack.
          </p>

          <div className="mt-8 w-full">
            <WaitlistForm />
          </div>

          <div className="mt-10">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Follow the pack
            </p>
            <SocialRow />
          </div>

          <div className="mt-16 w-full max-w-4xl">
            <HoverVideo />
          </div>

          <p className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
            Team? Double-click anywhere to enter.
          </p>
        </main>

        <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      </div>
    </div>
  );
};

import { useState } from "react";
import { InteractiveDotsBackground } from "@/components/InteractiveDotsBackground";
import { InteractiveLogo } from "./interactive-logo";
import { WaitlistForm } from "./waitlist-form";
import { SocialRow } from "./social-row";
import { HoverVideo } from "./hover-video";
import { PasswordDialog } from "./password-dialog";

export const ComingSoonPage = () => {
  const [pwOpen, setPwOpen] = useState(false);

  return (
    <div className="light">
      <div className="relative min-h-screen bg-background text-foreground">
        <InteractiveDotsBackground />

        <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center px-4 pb-16 pt-8 md:pt-20">
          <button
            type="button"
            onDoubleClick={() => setPwOpen(true)}
            aria-label="BizOrder"
            className="cursor-pointer rounded-full bg-transparent p-0 outline-none animate-fade-in focus-visible:ring-2 focus-visible:ring-primary"
          >
            <InteractiveLogo size={126} />
          </button>

          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-primary animate-pulse" />
            Launching soon
          </span>

          <h1 className="mt-5 max-w-3xl text-center font-display text-3xl font-bold leading-[1.1] md:text-6xl">
            Something bold is about to{" "}
            <span className="text-primary">prowl</span> the market.
          </h1>

          <p className="mt-4 max-w-xl text-center text-sm text-secondary md:text-lg">
            Be first in line — get the launch date, early-access perks, and a
            head start over the pack.
          </p>

          <div className="mt-7 w-full">
            <WaitlistForm />
          </div>

          <div className="mt-10">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Follow the pack
            </p>
            <SocialRow />
          </div>

          <div className="mt-12 w-full max-w-4xl">
            <HoverVideo />
          </div>
        </main>

        <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      </div>
    </div>
  );
};

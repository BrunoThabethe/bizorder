import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
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
      <SiteLayout>
        <section className="relative pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="container relative mx-auto px-4">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="animate-fade-in">
                <InteractiveLogo size={180} />
              </div>

              <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-primary animate-pulse" />
                Launching soon
              </span>

              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] md:text-6xl">
                Something bold is about to{" "}
                <span className="text-primary">prowl</span> the market.
              </h1>

              <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
                Be first in line — get the launch date, early-access perks, and
                a head start over the pack.
              </p>

              <div className="mt-8 w-full">
                <WaitlistForm />
              </div>

              <div className="mt-10">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Follow the pack
                </p>
                <SocialRow />
              </div>
            </div>
          </div>
        </section>

        <section className="relative pb-20 md:pb-28">
          <div className="container relative mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <HoverVideo />
            </div>
            <p className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              Team? Double-click anywhere to enter.
            </p>
          </div>
        </section>

        <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      </SiteLayout>
    </div>
  );
};

import { useEffect, useState } from "react";
import { LeopardMark } from "./leopard-mark";
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#0d0a07] text-foreground">
      {/* Background atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(38 63% 35% / 0.35), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 100%, hsl(28 31% 18% / 0.5), transparent 60%), linear-gradient(180deg, #0d0a07 0%, #050403 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          backgroundSize: "320px 320px",
        }}
      />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 pb-20 pt-14 md:pt-20">
        {/* Logo */}
        <section className="animate-[fade-in_0.8s_ease] flex w-full justify-center">
          <LeopardMark size={220} />
        </section>

        {/* Marketing two-liner */}
        <section className="mt-8 animate-[fade-in_1s_ease_0.2s_both] text-center">
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Something bold is about to <span className="text-primary">prowl</span> the market.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Be first in line — get the launch date, early-access perks, and a head start over the pack.
          </p>
        </section>

        {/* Email capture */}
        <section className="mt-8 w-full animate-[fade-in_1s_ease_0.4s_both]">
          <WaitlistForm />
        </section>

        {/* Social row */}
        <section className="mt-8 animate-[fade-in_1s_ease_0.6s_both]">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Follow the pack
          </p>
          <SocialRow />
        </section>

        {/* Spacer */}
        <div className="h-24 md:h-32" />

        {/* Video */}
        <section className="w-full animate-[fade-in_1s_ease_0.8s_both]">
          <HoverVideo />
        </section>

        {/* Tiny hint */}
        <p className="mt-10 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50">
          Team? Double-click anywhere to enter.
        </p>
      </main>

      <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} />

      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
};

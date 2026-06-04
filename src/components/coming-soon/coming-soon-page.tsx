import { useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import kraftTex from "@/assets/kraft-texture.jpg";
import logoSrc from "@/assets/bon-logo.png";
import { WaitlistForm } from "./waitlist-form";
import { SocialRow } from "./social-row";
import { PasswordDialog } from "./password-dialog";

// --- Rip geometry ---------------------------------------------------------
// A horizontal tear sits across the middle of the screen. Scrolling pulls the
// top half up and the bottom half down, opening a narrow band that reveals
// the email form + socials underneath. The kraft never leaves the viewport.
const CY = 50; // centre of rip, in % of viewport height
const SEGS = 36;

// Build a jagged horizontal edge across the full width.
// side = -1 produces the LOWER edge of the top half (tears upward),
// side = +1 produces the UPPER edge of the bottom half (tears downward).
const jaggedEdge = (side: -1 | 1): Array<[number, number]> => {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= SEGS; i++) {
    const x = (i / SEGS) * 100;
    const noise =
      Math.sin(i * 1.7 + (side > 0 ? 1.3 : 0)) * 1.1 +
      Math.cos(i * 3.1 + (side > 0 ? 0.4 : 0)) * 0.55 +
      Math.sin(i * 0.6) * 0.35;
    const y = CY + side * (0.4 + Math.abs(noise) * 0.9);
    pts.push([x, y]);
  }
  return pts;
};

const TOP_EDGE = jaggedEdge(-1);
const BOTTOM_EDGE = jaggedEdge(+1);

const topClip = (): string => {
  const pts = ["0% 0%", "100% 0%"];
  for (let i = TOP_EDGE.length - 1; i >= 0; i--) {
    const [x, y] = TOP_EDGE[i];
    pts.push(`${x}% ${y}%`);
  }
  return `polygon(${pts.join(", ")})`;
};

const bottomClip = (): string => {
  const pts: string[] = [];
  for (let i = 0; i < BOTTOM_EDGE.length; i++) {
    const [x, y] = BOTTOM_EDGE[i];
    pts.push(`${x}% ${y}%`);
  }
  pts.push("100% 100%", "0% 100%");
  return `polygon(${pts.join(", ")})`;
};

const CLIP_TOP = topClip();
const CLIP_BOTTOM = bottomClip();

// Max separation between halves, in viewport-height %.
// Just enough to expose the waitlist form + socials, not the whole page.
const MAX_SEP = 18;
// Scroll distance (px) required to fully open the rip.
const SCROLL_RANGE = 520;

interface ComingSoonPageProps {
  onUnlock?: () => void;
}

export const ComingSoonPage = ({ onUnlock }: ComingSoonPageProps) => {
  const [pwOpen, setPwOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastProgressRef = useRef(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const p = Math.max(0, Math.min(1, el.scrollTop / SCROLL_RANGE));
        if (Math.abs(p - lastProgressRef.current) < 0.002) return;
        lastProgressRef.current = p;
        setProgress(p);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const sep = MAX_SEP * progress; // in vh%
  const topTransform = `translate3d(0, -${sep}%, 0)`;
  const bottomTransform = `translate3d(0, ${sep}%, 0)`;
  const revealOpacity = Math.min(1, Math.max(0, (progress - 0.25) / 0.45));

  return (
    <div className="light">
      <div
        ref={scrollerRef}
        className="relative h-[100dvh] w-screen overflow-x-hidden overflow-y-auto overscroll-none bg-[#1a0e06]"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        {/* Hidden scroll spacer drives the rip animation */}
        <div style={{ height: `calc(100dvh + ${SCROLL_RANGE}px)` }} />

        {/* Fixed stage */}
        <div className="pointer-events-none fixed inset-0">
          {/* Reveal layer (behind kraft, visible through the rip) */}
          <div className="absolute inset-0 grid place-items-center px-6">
            <div
              className="pointer-events-auto w-full max-w-md text-center"
              style={{ opacity: revealOpacity, transition: "opacity 0.3s ease-out" }}
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-[#f3e9d3]">
                Want early access?
              </p>
              <WaitlistForm />
              <div className="mt-4">
                <SocialRow />
              </div>
            </div>
          </div>

          {/* Top kraft half */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${kraftTex})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              clipPath: CLIP_TOP,
              WebkitClipPath: CLIP_TOP,
              transform: topTransform,
              willChange: "transform",
              filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.45))",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="pointer-events-auto absolute right-4 top-4 md:right-8 md:top-6">
              <button
                type="button"
                onDoubleClick={() => setPwOpen(true)}
                aria-label="BizOrder"
                className="rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-900"
              >
                <img
                  src={logoSrc}
                  alt="BizOrder"
                  className="h-12 w-12 drop-shadow-[0_3px_8px_rgba(0,0,0,0.3)] md:h-14 md:w-14"
                  draggable={false}
                />
              </button>
            </div>

            <div className="absolute inset-x-0 top-[14%] flex flex-col items-center px-6 text-center md:top-[16%]">
              <h1 className="font-display text-[clamp(2.6rem,12vw,6rem)] font-bold leading-[0.92] tracking-tight text-[#2a160a]">
                COMING SOON
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#3a2418]/90 md:text-base">
                A bold new way to find, book and trust local businesses.
              </p>
            </div>
          </div>

          {/* Bottom kraft half */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${kraftTex})`,
              backgroundSize: "cover",
              backgroundPosition: "center bottom",
              clipPath: CLIP_BOTTOM,
              WebkitClipPath: CLIP_BOTTOM,
              transform: bottomTransform,
              willChange: "transform",
              filter: "drop-shadow(0 -8px 18px rgba(0,0,0,0.45))",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="absolute inset-x-0 bottom-[10%] flex flex-col items-center px-6 text-center md:bottom-[12%]">
              <h2 className="font-display text-[clamp(1.4rem,5.5vw,2.5rem)] font-bold tracking-[0.22em] text-[#2a160a]">
                EXCLUSIVE
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.28em] text-[#5a3920]">Join the pack</p>
            </div>
          </div>

          {/* Scroll hint */}
          <div
            className="absolute inset-x-0 bottom-6 flex flex-col items-center text-[#f3e9d3]"
            style={{
              opacity: Math.max(0, 1 - progress * 2.4),
              transition: "opacity 0.25s",
            }}
          >
            <span className="text-[20px] font-semibold uppercase tracking-[0.32em]">Scroll to tear open</span>
            <ChevronDown className="mt-1 h-4 w-4 animate-bounce" />
          </div>
        </div>

        <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} onUnlock={onUnlock} />
      </div>
    </div>
  );
};

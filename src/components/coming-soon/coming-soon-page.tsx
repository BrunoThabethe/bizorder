import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import kraftTex from "@/assets/kraft-texture.jpg";
import logoSrc from "@/assets/bon-logo.png";
import woodSrc from "@/assets/wood-slice.png";
import { WaitlistForm } from "./waitlist-form";
import { SocialRow } from "./social-row";
import { PasswordDialog } from "./password-dialog";

// --- Torn-edge geometry (computed once) ------------------------------------
const SLIT_Y = 56; // %
const ZIG_SEGS = 32;
const ZIG_AMP = 2.4;

const ZIG_YS: number[] = (() => {
  const ys: number[] = [];
  for (let i = 0; i <= ZIG_SEGS; i++) {
    const noise =
      Math.sin(i * 1.7) * 1.1 +
      Math.cos(i * 3.1) * 0.6 +
      Math.sin(i * 0.5) * 0.4;
    ys.push(SLIT_Y + (i % 2 === 0 ? ZIG_AMP : -ZIG_AMP) + noise);
  }
  return ys;
})();

const TOP_CLIP = `polygon(0% 0%, 100% 0%, ${ZIG_YS.map((y, i) => {
  const x = 100 - (i / ZIG_SEGS) * 100;
  return `${x}% ${y}%`;
}).join(", ")})`;

const BOTTOM_CLIP = `polygon(${ZIG_YS.map((y, i) => {
  const x = (i / ZIG_SEGS) * 100;
  return `${x}% ${y}%`;
}).join(", ")}, 100% 100%, 0% 100%)`;

interface ComingSoonPageProps {
  onUnlock?: () => void;
}

export const ComingSoonPage = ({ onUnlock }: ComingSoonPageProps) => {
  const [pwOpen, setPwOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [winW, setWinW] = useState(
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const updateProgress = (p: number) => {
    progressRef.current = p;
    setProgress(p);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (revealed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = e.clientX;
    setDragging(true);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current == null) return;
    const dx = dragStart.current - e.clientX;
    const max = Math.min(winW * 0.65, 520);
    const p = Math.max(0, Math.min(1, dx / max));
    updateProgress(p);
    if (p >= 0.88) {
      setRevealed(true);
      updateProgress(1);
      dragStart.current = null;
      setDragging(false);
    }
  };
  const handlePointerUp = () => {
    if (dragStart.current == null) return;
    dragStart.current = null;
    setDragging(false);
    if (progressRef.current < 0.88) updateProgress(0);
  };

  // Top half lifts and tilts; bottom half drops.
  const topShift = -progress * 60; // vh
  const bottomShift = progress * 60; // vh
  const handleX = -progress * Math.min(winW * 0.75, 620); // px
  const trans = dragging
    ? "none"
    : "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div className="light">
      <div className="relative h-[100dvh] w-screen overflow-hidden bg-[#1f1208] text-foreground">
        {/* ---------- Reveal layer (behind the kraft) ---------- */}
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center px-6">
          <div
            className={`w-full max-w-md text-center transition-opacity duration-500 ${
              progress > 0.2 || revealed ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200/80">
              Inside the envelope
            </p>
            <h2 className="mb-5 font-display text-3xl font-bold leading-tight text-amber-50 md:text-4xl">
              Join the pack early.
            </h2>
            <WaitlistForm />
            <div className="mt-7">
              <SocialRow />
            </div>
          </div>
        </div>

        {/* ---------- Wood slice (behind kraft, peeking through rip) ---------- */}
        <img
          src={woodSrc}
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-[-7%] top-[52%] z-[5] h-[22vh] w-[22vh] -translate-y-1/2 select-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)] md:h-[28vh] md:w-[28vh]"
          draggable={false}
        />

        {/* ---------- Top kraft half ---------- */}
        <div
          aria-hidden={revealed}
          className="absolute inset-0 z-10 select-none will-change-transform"
          style={{
            backgroundImage: `url(${kraftTex})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            clipPath: TOP_CLIP,
            WebkitClipPath: TOP_CLIP,
            transform: `translateY(${topShift}vh) rotate(${-progress * 1.5}deg)`,
            transformOrigin: "left bottom",
            transition: trans,
            filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.45))",
          }}
        >
          {/* Logo top-right */}
          <div className="absolute right-5 top-5 md:right-12 md:top-10">
            <button
              type="button"
              onDoubleClick={() => setPwOpen(true)}
              aria-label="BizOrder"
              className="rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-900"
            >
              <img
                src={logoSrc}
                alt="BizOrder"
                className="h-14 w-14 drop-shadow-[0_3px_8px_rgba(0,0,0,0.25)] md:h-20 md:w-20"
                draggable={false}
              />
            </button>
          </div>

          {/* COMING SOON headline */}
          <div className="absolute inset-x-0 top-[20%] flex flex-col items-center px-4 md:top-[18%]">
            <h1 className="font-display text-[clamp(2.5rem,11vw,7rem)] font-bold leading-[0.95] tracking-tight text-[#2a160a] drop-shadow-[0_2px_0_rgba(255,255,255,0.18)]">
              COMING
            </h1>
            <h1 className="font-display text-[clamp(2.5rem,11vw,7rem)] font-bold leading-[0.95] tracking-tight text-[#2a160a] drop-shadow-[0_2px_0_rgba(255,255,255,0.18)]">
              SOON
            </h1>
          </div>

          {/* "Want early access?" pointer above the handle */}
          {!revealed && (
            <div
              className="absolute bottom-[6%] right-[6%] flex items-center gap-2 text-[#2a160a] md:bottom-[8%] md:right-[10%]"
              style={{ opacity: Math.max(0, 1 - progress * 1.6) }}
            >
              <span className="font-display text-sm font-bold italic md:text-base">
                Want early access?
              </span>
              <ArrowLeft className="h-4 w-4 animate-pulse" />
            </div>
          )}
        </div>

        {/* ---------- Bottom kraft half ---------- */}
        <div
          aria-hidden={revealed}
          className="absolute inset-0 z-10 select-none will-change-transform"
          style={{
            backgroundImage: `url(${kraftTex})`,
            backgroundSize: "cover",
            backgroundPosition: "center bottom",
            clipPath: BOTTOM_CLIP,
            WebkitClipPath: BOTTOM_CLIP,
            transform: `translateY(${bottomShift}vh)`,
            transition: trans,
            filter: "drop-shadow(0 -14px 22px rgba(0,0,0,0.45))",
          }}
        >
          <div className="absolute inset-x-0 top-[12%] flex flex-col items-center px-4 md:top-[14%]">
            <h2 className="font-display text-[clamp(1.8rem,7vw,4.5rem)] font-bold tracking-[0.18em] text-[#2a160a]">
              EXCLUSIVE
            </h2>
            <p className="mt-4 max-w-xs text-center text-xs leading-relaxed text-[#3a2418]/90 md:max-w-sm md:text-sm">
              A bold new way to find, book and trust local businesses. Be first
              in line when the doors open.
            </p>
          </div>
        </div>

        {/* ---------- Drag handle (the tab to rip) ---------- */}
        {!revealed && (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="slider"
            aria-label="Drag right to left to rip open the envelope"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            className="absolute z-30 touch-none cursor-grab select-none active:cursor-grabbing"
            style={{
              top: `${SLIT_Y}%`,
              right: 16,
              transform: `translate(${handleX}px, -50%)`,
              transition: trans,
            }}
          >
            <div className="relative flex items-center gap-2 rounded-full bg-[#2a160a] px-4 py-3 text-amber-50 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-2 ring-amber-100/30">
              <span
                aria-hidden
                className="absolute inset-0 -z-10 animate-ping rounded-full bg-amber-100/40"
              />
              <ArrowLeft className="h-5 w-5" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
                Hold &amp; drag
              </span>
            </div>
          </div>
        )}

        <PasswordDialog
          open={pwOpen}
          onOpenChange={setPwOpen}
          onUnlock={onUnlock}
        />
      </div>
    </div>
  );
};

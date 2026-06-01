import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import kraftTex from "@/assets/kraft-texture.jpg";
import kraftRoll from "@/assets/kraft-roll.png";
import logoSrc from "@/assets/bon-logo.png";
import { WaitlistForm } from "./waitlist-form";
import { SocialRow } from "./social-row";
import { PasswordDialog } from "./password-dialog";

// --- Rip geometry (HORIZONTAL band) ---------------------------------------
// The kraft is split into a top half and a bottom half that meet at CY.
// Between RIP_END_X (left, fully torn) and RIP_START_X (right, where the
// curl is grabbed) the inner edges dent away from the middle, exposing a
// jagged horizontal rip. As the user drags the curl leftward, RIP_END_X
// decreases (rip extends further across the page).
const CY = 50; // centre of rip, %
const RIP_START_X = 94; // % — right side where the curl lives
const RIP_END_X_MIN = 6; // % — fully torn position
const HALF_RIGHT = 18; // % half-height of rip at the right (where curl is)
const HALF_LEFT = 12; // % half-height at the left (tapers to a point)
const SEAM = 0.6; // % overlap so the two halves meet seamlessly
const SEGS = 28;

const jaggedY = (i: number, side: -1 | 1, leftEndX: number): number => {
  // i goes from 0 (right edge of rip) to SEGS (left edge of rip).
  const t = i / SEGS;
  const half = HALF_RIGHT + (HALF_LEFT - HALF_RIGHT) * t;
  const noise =
    Math.sin(i * 2.3 + (side > 0 ? 1.5 : 0)) * 1.6 +
    Math.cos(i * 4.1 + (side > 0 ? 0.7 : 0)) * 0.8 +
    Math.sin(i * 0.7) * 0.4;
  return CY + side * (half + noise * 0.55);
};

const xAt = (i: number, leftEndX: number): number => {
  const t = i / SEGS;
  return RIP_START_X + (leftEndX - RIP_START_X) * t;
};

const buildClip = (side: -1 | 1, progress: number): string => {
  // side: -1 = top half, +1 = bottom half
  const leftEndX =
    RIP_START_X - (RIP_START_X - RIP_END_X_MIN) * Math.max(0.03, progress);
  const inner = side === -1 ? CY + SEAM : CY - SEAM;
  const pts: string[] = [];

  if (side === -1) {
    // Top half — outline clockwise.
    pts.push("0% 0%", "100% 0%", `100% ${inner}%`);
    pts.push(`${RIP_START_X}% ${inner}%`);
    // dive up into the rip along the upper jagged edge, right -> left
    for (let i = 0; i <= SEGS; i++) {
      pts.push(`${xAt(i, leftEndX)}% ${jaggedY(i, -1, leftEndX)}%`);
    }
    pts.push(`${leftEndX}% ${inner}%`);
    pts.push(`0% ${inner}%`);
  } else {
    // Bottom half — outline clockwise.
    pts.push(`0% ${inner}%`);
    pts.push(`${leftEndX}% ${inner}%`);
    // climb down along the lower jagged edge, left -> right
    for (let i = SEGS; i >= 0; i--) {
      pts.push(`${xAt(i, leftEndX)}% ${jaggedY(i, +1, leftEndX)}%`);
    }
    pts.push(`${RIP_START_X}% ${inner}%`);
    pts.push(`100% ${inner}%`, "100% 100%", "0% 100%");
  }
  return `polygon(${pts.join(", ")})`;
};

interface ComingSoonPageProps {
  onUnlock?: () => void;
}

export const ComingSoonPage = ({ onUnlock }: ComingSoonPageProps) => {
  const [pwOpen, setPwOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [winW, setWinW] = useState(() =>
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const setP = (p: number) => {
    progressRef.current = p;
    setProgress(p);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (revealed) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current == null) return;
    const dx = startX.current - e.clientX; // dragging LEFT increases dx
    const maxDx = Math.min(winW * 0.7, 720);
    const p = Math.max(0, Math.min(1, dx / maxDx));
    setP(p);
    if (p >= 0.95) {
      setRevealed(true);
      setP(1);
      startX.current = null;
      setDragging(false);
    }
  };
  const onPointerUp = () => {
    if (startX.current == null) return;
    startX.current = null;
    setDragging(false);
    if (progressRef.current >= 0.55) {
      setRevealed(true);
      setP(1);
    } else {
      setP(0);
    }
  };

  const clipTop = buildClip(-1, progress);
  const clipBottom = buildClip(+1, progress);
  const trans = dragging
    ? "none"
    : "clip-path 0.55s cubic-bezier(0.22,1,0.36,1), -webkit-clip-path 0.55s cubic-bezier(0.22,1,0.36,1)";

  const leftEndX =
    RIP_START_X - (RIP_START_X - RIP_END_X_MIN) * Math.max(0.03, progress);
  // Curl sits at the right end of the rip and rides leftward with progress.
  const curlLeftPct =
    RIP_START_X - (RIP_START_X - RIP_END_X_MIN) * progress;
  const curlScale = 1 + progress * 0.18;

  return (
    <div className="light">
      <div className="relative h-[100dvh] w-screen overflow-hidden bg-[#f4ece1] text-foreground">
        {/* --- Reveal layer (behind the kraft, visible through the rip) --- */}
        <div className="absolute inset-0 z-0 flex items-center justify-center px-4">
          <div
            className="w-full max-w-lg text-center"
            style={{
              opacity: progress > 0.18 || revealed ? 1 : 0,
              transition: "opacity 0.45s ease-out",
            }}
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#7a5836]">
              You're in early
            </p>
            <h2 className="mb-4 font-display text-2xl font-bold leading-tight text-[#2a160a] md:text-3xl">
              Join the pack.
            </h2>
            <WaitlistForm />
            <div className="mt-5">
              <SocialRow />
            </div>
          </div>
        </div>

        {/* --- Top kraft half --- */}
        <KraftHalf clip={clipTop} trans={trans} side="top">
          {/* Logo top-right */}
          <div className="absolute right-4 top-4 md:right-10 md:top-8">
            <button
              type="button"
              onDoubleClick={() => setPwOpen(true)}
              aria-label="BizOrder"
              className="rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-900"
            >
              <img
                src={logoSrc}
                alt="BizOrder"
                className="h-12 w-12 drop-shadow-[0_3px_8px_rgba(0,0,0,0.25)] md:h-16 md:w-16"
                draggable={false}
              />
            </button>
          </div>

          {/* COMING SOON headline — sits in the upper half of the kraft */}
          <div className="pointer-events-none absolute inset-x-0 top-[10%] flex flex-col items-center px-4 md:top-[12%]">
            <h1 className="font-display text-[clamp(2.4rem,11vw,7rem)] font-bold leading-[0.95] tracking-tight text-[#2a160a] drop-shadow-[0_2px_0_rgba(255,255,255,0.18)]">
              COMING
            </h1>
            <h1 className="font-display text-[clamp(2.4rem,11vw,7rem)] font-bold leading-[0.95] tracking-tight text-[#2a160a] drop-shadow-[0_2px_0_rgba(255,255,255,0.18)]">
              SOON
            </h1>
          </div>

          {/* "Want early access?" hint sits just above the curl */}
          {!revealed && (
            <div
              className="pointer-events-none absolute flex items-center gap-2 text-[#2a160a]"
              style={{
                top: `calc(${CY}% - ${HALF_RIGHT + 6}%)`,
                left: `${curlLeftPct - 14}%`,
                opacity: Math.max(0, 1 - progress * 1.6),
                transition: dragging ? "none" : "left 0.2s, opacity 0.2s",
              }}
            >
              <span className="font-display text-sm font-bold italic md:text-base">
                Want early access?
              </span>
              <ArrowLeft className="h-4 w-4 animate-pulse" />
            </div>
          )}
        </KraftHalf>

        {/* --- Bottom kraft half --- */}
        <KraftHalf clip={clipBottom} trans={trans} side="bottom">
          <div className="pointer-events-none absolute inset-x-0 bottom-[10%] flex flex-col items-center px-4 md:bottom-[12%]">
            <h2 className="font-display text-[clamp(1.6rem,6vw,3.75rem)] font-bold tracking-[0.18em] text-[#2a160a]">
              EXCLUSIVE
            </h2>
            <p className="mt-3 max-w-xs text-center text-xs leading-relaxed text-[#3a2418]/90 md:max-w-sm md:text-sm">
              A bold new way to find, book and trust local businesses.
            </p>
          </div>
        </KraftHalf>

        {/* --- Curl roll (the draggable handle) --- */}
        {!revealed && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="slider"
            aria-label="Drag right to left to rip the paper open"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            className="absolute z-30 touch-none cursor-grab select-none active:cursor-grabbing"
            style={{
              top: `${CY}%`,
              left: `${curlLeftPct}%`,
              transform: `translate(-50%, -50%) rotate(90deg) scale(${curlScale})`,
              transformOrigin: "center center",
              transition: dragging ? "none" : "left 0.4s ease-out, transform 0.4s ease-out",
              width: "min(48vh, 320px)",
              filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.4))",
            }}
          >
            <img
              src={kraftRoll}
              alt=""
              aria-hidden
              className="pointer-events-none h-auto w-full select-none"
              draggable={false}
            />
            {/* enlarged hit area for easier mobile grab */}
            <span aria-hidden className="absolute -inset-6" />
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

// --- Kraft half wrapper ---------------------------------------------------
interface KraftHalfProps {
  clip: string;
  trans: string;
  side: "top" | "bottom";
  children?: React.ReactNode;
}

const KraftHalf = ({ clip, trans, side, children }: KraftHalfProps) => (
  <div
    className="absolute inset-0 z-10 select-none"
    style={{
      backgroundImage: `url(${kraftTex})`,
      backgroundSize: "cover",
      backgroundPosition: side === "top" ? "center top" : "center bottom",
      clipPath: clip,
      WebkitClipPath: clip,
      transition: trans,
      filter:
        side === "top"
          ? "drop-shadow(0 6px 14px rgba(0,0,0,0.35))"
          : "drop-shadow(0 -6px 14px rgba(0,0,0,0.35))",
    }}
  >
    {children}
  </div>
);

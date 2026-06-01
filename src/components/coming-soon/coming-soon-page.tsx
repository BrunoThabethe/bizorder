import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import kraftTex from "@/assets/kraft-texture.jpg";
import kraftRoll from "@/assets/kraft-roll.png";
import logoSrc from "@/assets/bon-logo.png";
import { WaitlistForm } from "./waitlist-form";
import { SocialRow } from "./social-row";
import { PasswordDialog } from "./password-dialog";

// --- Rip geometry ---------------------------------------------------------
// The kraft is rendered as two halves (left + right) that meet at the centre.
// Between HOLE_TOP_Y and the moving bottom edge, each half's inner edge dents
// inward following a jagged curve — that opening is the "rip".
const HOLE_TOP_Y = 30; // % from top — where the tear starts (under headline)
const HOLE_END_Y = 96; // % — fully torn
const CX = 50; // centre of rip, %
const HALF_TOP = 38; // % — half-width of rip at the top
const HALF_BOT = 32; // % — half-width at the very bottom
const SEAM = 0.6; // % — tiny overlap so the two halves meet without a seam
const SEGS = 26;

const jaggedX = (i: number, side: -1 | 1): number => {
  const t = i / SEGS;
  const half = HALF_TOP + (HALF_BOT - HALF_TOP) * t;
  const noise =
    Math.sin(i * 2.3 + (side > 0 ? 1.5 : 0)) * 1.6 +
    Math.cos(i * 4.1 + (side > 0 ? 0.7 : 0)) * 0.8 +
    Math.sin(i * 0.7) * 0.4;
  return CX + side * (half + noise * 0.55);
};

const buildClip = (side: -1 | 1, progress: number): string => {
  const bottomY =
    HOLE_TOP_Y + (HOLE_END_Y - HOLE_TOP_Y) * Math.max(0.03, progress);
  const inner = side === -1 ? CX + SEAM : CX - SEAM;
  const pts: string[] = [];

  if (side === -1) {
    pts.push("0% 0%", `${inner}% 0%`, `${inner}% ${HOLE_TOP_Y}%`);
    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS;
      const y = HOLE_TOP_Y + (bottomY - HOLE_TOP_Y) * t;
      pts.push(`${jaggedX(i, -1)}% ${y}%`);
    }
    pts.push(`${inner}% ${bottomY}%`, `${inner}% 100%`, "0% 100%");
  } else {
    pts.push("100% 0%", "100% 100%", `${inner}% 100%`, `${inner}% ${bottomY}%`);
    for (let i = SEGS; i >= 0; i--) {
      const t = i / SEGS;
      const y = HOLE_TOP_Y + (bottomY - HOLE_TOP_Y) * t;
      pts.push(`${jaggedX(i, +1)}% ${y}%`);
    }
    pts.push(`${inner}% ${HOLE_TOP_Y}%`, `${inner}% 0%`);
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
  const startY = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [winH, setWinH] = useState(() =>
    typeof window === "undefined" ? 800 : window.innerHeight,
  );

  useEffect(() => {
    const onResize = () => setWinH(window.innerHeight);
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
    startY.current = e.clientY;
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startY.current == null) return;
    const dy = e.clientY - startY.current;
    const maxDy = Math.min(winH * 0.55, 460);
    const p = Math.max(0, Math.min(1, dy / maxDy));
    setP(p);
    if (p >= 0.95) {
      setRevealed(true);
      setP(1);
      startY.current = null;
      setDragging(false);
    }
  };
  const onPointerUp = () => {
    if (startY.current == null) return;
    startY.current = null;
    setDragging(false);
    if (progressRef.current >= 0.55) {
      setRevealed(true);
      setP(1);
    } else {
      setP(0);
    }
  };

  const clipLeft = buildClip(-1, progress);
  const clipRight = buildClip(+1, progress);
  const trans = dragging
    ? "none"
    : "clip-path 0.55s cubic-bezier(0.22,1,0.36,1), -webkit-clip-path 0.55s cubic-bezier(0.22,1,0.36,1)";

  // Curl follows the top of the rip; grows slightly as more is torn.
  const curlScale = 1 + progress * 0.18;

  return (
    <div className="light">
      <div className="relative h-[100dvh] w-screen overflow-hidden bg-[#f4ece1] text-foreground">
        {/* --- Reveal layer (sits behind the kraft, shown through the rip) --- */}
        <div className="absolute inset-0 z-0 flex items-start justify-center">
          <div
            className="relative w-full max-w-md px-6 text-center"
            style={{
              paddingTop: `calc(${HOLE_TOP_Y}vh + 56px)`,
              opacity: progress > 0.15 || revealed ? 1 : 0,
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
            <div className="mt-6">
              <SocialRow />
            </div>
          </div>
        </div>

        {/* --- Left kraft half --- */}
        <KraftHalf clip={clipLeft} trans={trans} side="left">
          {/* Logo top-right lives on the RIGHT half; nothing here at top-right. */}
          {/* Side label, vertical text, like the "VOL-III" stamp on the ref. */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 md:left-5">
            <span
              className="block font-display text-[10px] font-semibold uppercase tracking-[0.45em] text-[#3a2418]/70"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Vol · I — 2026
            </span>
          </div>

          {/* COMING — left side of headline */}
          <div className="pointer-events-none absolute inset-x-0 top-[10%] flex justify-end pr-1 md:top-[8%]">
            <h1 className="font-display text-[clamp(2.4rem,11vw,7rem)] font-bold leading-[0.95] tracking-tight text-[#2a160a] drop-shadow-[0_2px_0_rgba(255,255,255,0.18)]">
              COMING&nbsp;
            </h1>
          </div>
        </KraftHalf>

        {/* --- Right kraft half --- */}
        <KraftHalf clip={clipRight} trans={trans} side="right">
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

          {/* SOON — right side of headline */}
          <div className="pointer-events-none absolute inset-x-0 top-[10%] flex justify-start pl-1 md:top-[8%]">
            <h1 className="font-display text-[clamp(2.4rem,11vw,7rem)] font-bold leading-[0.95] tracking-tight text-[#2a160a] drop-shadow-[0_2px_0_rgba(255,255,255,0.18)]">
              &nbsp;SOON
            </h1>
          </div>
        </KraftHalf>

        {/* --- "Want early access?" hint above the curl --- */}
        {!revealed && (
          <div
            className="pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 flex-col items-center text-[#2a160a]"
            style={{
              top: `calc(${HOLE_TOP_Y}% - 78px)`,
              opacity: Math.max(0, 1 - progress * 2),
              transition: "opacity 0.2s",
            }}
          >
            <span className="font-display text-sm font-bold italic md:text-base">
              Want early access?
            </span>
            <ChevronDown className="mt-1 h-5 w-5 animate-bounce" />
          </div>
        )}

        {/* --- Curl roll (the draggable handle) --- */}
        {!revealed && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="slider"
            aria-label="Drag down to rip the paper open"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            className="absolute left-1/2 z-30 touch-none cursor-grab select-none active:cursor-grabbing"
            style={{
              top: `${HOLE_TOP_Y}%`,
              transform: `translate(-50%, -58%) scale(${curlScale})`,
              transformOrigin: "center center",
              transition: dragging ? "none" : "transform 0.4s ease-out",
              width: "min(60vw, 320px)",
              filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.35))",
            }}
          >
            <img
              src={kraftRoll}
              alt=""
              aria-hidden
              className="pointer-events-none h-auto w-full select-none"
              draggable={false}
            />
            {/* invisible enlarged hit area for easier mobile grab */}
            <span
              aria-hidden
              className="absolute inset-x-0 -top-4 -bottom-4"
            />
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
  side: "left" | "right";
  children?: React.ReactNode;
}

const KraftHalf = ({ clip, trans, side, children }: KraftHalfProps) => (
  <div
    className="absolute inset-0 z-10 select-none"
    style={{
      backgroundImage: `url(${kraftTex})`,
      backgroundSize: "cover",
      backgroundPosition: side === "left" ? "left center" : "right center",
      clipPath: clip,
      WebkitClipPath: clip,
      transition: trans,
      filter:
        side === "left"
          ? "drop-shadow(6px 0 14px rgba(0,0,0,0.35))"
          : "drop-shadow(-6px 0 14px rgba(0,0,0,0.35))",
    }}
  >
    {children}
  </div>
);

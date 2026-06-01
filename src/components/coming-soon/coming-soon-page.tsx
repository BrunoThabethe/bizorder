import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import kraftTex from "@/assets/kraft-texture.jpg";
import logoSrc from "@/assets/bon-logo.png";
import { WaitlistForm } from "./waitlist-form";
import { SocialRow } from "./social-row";
import { PasswordDialog } from "./password-dialog";

// --- Rip geometry ---------------------------------------------------------
// A horizontal tear sits across the middle of the viewport. Scrolling pulls
// the top half up and the bottom half down, opening a narrow band that
// reveals the email form + socials underneath. The kraft never leaves the
// viewport. The torn edges carry SVG-painted highlights/shadows so they read
// like real paper fibres instead of flat zig-zags.
const CY = 50; // centre of rip, in % of viewport height
const SEGS = 220; // high segment count → fibre-fine jaggedness

type Pt = [number, number];

const buildEdge = (seed: number): Pt[] => {
  const pts: Pt[] = [];
  for (let i = 0; i <= SEGS; i++) {
    const x = (i / SEGS) * 100;
    // Layered noise: big undulation + medium dents + fibre-scale jitter.
    const big = Math.sin(i * 0.09 + seed) * 1.6;
    const mid = Math.cos(i * 0.42 + seed * 1.7) * 0.9;
    const fine = Math.sin(i * 1.9 + seed * 3.1) * 0.5;
    const fibre = (Math.sin(i * 7.3 + seed * 5) + Math.cos(i * 11.1)) * 0.18;
    const y = CY + big + mid + fine + fibre;
    pts.push([x, y]);
  }
  return pts;
};

const TOP_EDGE = buildEdge(0.7); // lower edge of top half
const BOTTOM_EDGE = buildEdge(2.3); // upper edge of bottom half

const pathFromEdge = (edge: Pt[]): string =>
  edge.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(3)},${y.toFixed(3)}`).join(" ");

const TOP_EDGE_PATH = pathFromEdge(TOP_EDGE);
const BOTTOM_EDGE_PATH = pathFromEdge(BOTTOM_EDGE);

const clipFromEdge = (edge: Pt[], side: "top" | "bottom"): string => {
  if (side === "top") {
    const pts = ["0% 0%", "100% 0%"];
    for (let i = edge.length - 1; i >= 0; i--) {
      pts.push(`${edge[i][0]}% ${edge[i][1]}%`);
    }
    return `polygon(${pts.join(", ")})`;
  }
  const pts: string[] = [];
  for (let i = 0; i < edge.length; i++) {
    pts.push(`${edge[i][0]}% ${edge[i][1]}%`);
  }
  pts.push("100% 100%", "0% 100%");
  return `polygon(${pts.join(", ")})`;
};

const CLIP_TOP = clipFromEdge(TOP_EDGE, "top");
const CLIP_BOTTOM = clipFromEdge(BOTTOM_EDGE, "bottom");

// Max separation between halves, in viewport-height %.
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

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const p = Math.max(0, Math.min(1, el.scrollTop / SCROLL_RANGE));
      setProgress(p);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const sep = MAX_SEP * progress; // in vh%
  const topTransform = `translateY(-${sep}%)`;
  const bottomTransform = `translateY(${sep}%)`;
  const revealOpacity = Math.min(1, Math.max(0, (progress - 0.25) / 0.45));

  return (
    <div className="light">
      <div
        ref={scrollerRef}
        className="relative h-[100dvh] w-screen overflow-x-hidden overflow-y-auto bg-[#0e0703]"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Hidden scroll spacer drives the rip animation */}
        <div style={{ height: `calc(100dvh + ${SCROLL_RANGE}px)` }} />

        {/* Fixed stage */}
        <div className="pointer-events-none fixed inset-0">
          {/* Dark void behind the rip (visible through the gap) */}
          <div
            className="absolute inset-x-0"
            style={{
              top: `${CY - MAX_SEP - 2}%`,
              height: `${MAX_SEP * 2 + 4}%`,
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0) 100%)",
            }}
          />

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
          <KraftHalf
            side="top"
            clip={CLIP_TOP}
            edgePath={TOP_EDGE_PATH}
            transform={topTransform}
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

            <div className="absolute inset-x-0 top-[16%] flex flex-col items-center px-6 text-center md:top-[18%]">
              <h1 className="font-display text-[clamp(2.6rem,12vw,6rem)] font-bold leading-[0.92] tracking-tight text-[#2a160a]">
                COMING SOON
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#3a2418]/90 md:text-base">
                A bold new way to find, book and trust local businesses.
              </p>
            </div>
          </KraftHalf>

          {/* Bottom kraft half */}
          <KraftHalf
            side="bottom"
            clip={CLIP_BOTTOM}
            edgePath={BOTTOM_EDGE_PATH}
            transform={bottomTransform}
          >
            <div className="absolute inset-x-0 bottom-[10%] flex flex-col items-center px-6 text-center md:bottom-[12%]">
              <h2 className="font-display text-[clamp(1.4rem,5.5vw,2.5rem)] font-bold tracking-[0.22em] text-[#2a160a]">
                EXCLUSIVE
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.28em] text-[#5a3920]">
                Join the pack
              </p>
            </div>
          </KraftHalf>

          {/* Scroll hint */}
          <div
            className="absolute inset-x-0 bottom-6 flex flex-col items-center text-[#f3e9d3]"
            style={{
              opacity: Math.max(0, 1 - progress * 2.4),
              transition: "opacity 0.25s",
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.32em]">
              Scroll to tear open
            </span>
            <ChevronDown className="mt-1 h-4 w-4 animate-bounce" />
          </div>
        </div>

        <PasswordDialog
          open={pwOpen}
          onOpenChange={setPwOpen}
          onUnlock={onUnlock}
        />
      </div>
    </div>
  );
};

// --- Kraft half with realistic torn edge ---------------------------------
interface KraftHalfProps {
  side: "top" | "bottom";
  clip: string;
  edgePath: string;
  transform: string;
  children?: React.ReactNode;
}

const KraftHalf = ({ side, clip, edgePath, transform, children }: KraftHalfProps) => {
  // Direction the edge faces (where the "paper core" highlight should sit).
  const isTop = side === "top";
  return (
    <div
      className="absolute inset-0"
      style={{
        clipPath: clip,
        WebkitClipPath: clip,
        transform,
        transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
      filter: isTop
          ? "drop-shadow(0 14px 22px rgba(0,0,0,0.7)) drop-shadow(0 4px 6px rgba(0,0,0,0.45))"
          : "drop-shadow(0 -14px 22px rgba(0,0,0,0.7)) drop-shadow(0 -4px 6px rgba(0,0,0,0.45))",
      }}
    >
      {/* Kraft texture base */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${kraftTex})`,
          backgroundSize: "cover",
          backgroundPosition: isTop ? "center top" : "center bottom",
        }}
      />

      {/* Lighter "paper interior" band fading inward from the torn edge.
          Real torn paper exposes the lighter fibres just under the printed
          surface, so the kraft brightens for ~5% before returning to normal. */}
      <div
        className="absolute inset-x-0"
        style={{
          top: isTop ? `${CY - 7}%` : `${CY - 0.2}%`,
          height: "7.2%",
          background: isTop
            ? "linear-gradient(to bottom, rgba(255,243,220,0) 0%, rgba(255,243,220,0.35) 70%, rgba(255,248,232,0.75) 100%)"
            : "linear-gradient(to top, rgba(255,243,220,0) 0%, rgba(255,243,220,0.35) 70%, rgba(255,248,232,0.75) 100%)",
          mixBlendMode: "screen",
        }}
      />

      {/* Subtle inner crease shadow just beside the bright band — the
          curl/lip catches a thin shadow on the printed surface. */}
      <div
        className="absolute inset-x-0"
        style={{
          top: isTop ? `${CY - 9}%` : `${CY + 1.8}%`,
          height: "2.2%",
          background: isTop
            ? "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 100%)"
            : "linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Painted torn edge: cream halo + bright white fibre core + grit. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {/* Wide soft cream halo (paper bulk showing through) */}
        <path
          d={edgePath}
          fill="none"
          stroke="#fbf1d8"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.45}
          vectorEffect="non-scaling-stroke"
          style={{ filter: "blur(1.2px)" }}
        />
        {/* Mid cream layer */}
        <path
          d={edgePath}
          fill="none"
          stroke="#f7ecd6"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
          vectorEffect="non-scaling-stroke"
          style={{ filter: "blur(0.4px)" }}
        />
        {/* Bright off-white fibre core */}
        <path
          d={edgePath}
          fill="none"
          stroke="#fffdf5"
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.98}
          vectorEffect="non-scaling-stroke"
        />
        {/* Dashed darker fibre flecks for grit */}
        <path
          d={edgePath}
          fill="none"
          stroke="#6b3d1d"
          strokeWidth={0.45}
          strokeDasharray="0.5 1.6"
          strokeLinecap="round"
          opacity={0.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {children}
    </div>
  );
};

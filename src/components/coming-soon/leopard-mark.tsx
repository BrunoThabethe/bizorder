import { useEffect, useRef, useState } from "react";
import leopardSrc from "@/assets/bon-leopard.png";

/**
 * Interactive logo. The whole image subtly tilts and breathes toward the
 * cursor, plus two soft "ear" highlights wiggle and a "tail" arc sways —
 * giving the impression the leopard notices the visitor.
 */
export const LeopardMark = ({ size = 240 }: { size?: number }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [t, setT] = useState(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setPointer({
        x: (e.clientX / w) * 2 - 1, // -1..1
        y: (e.clientY / h) * 2 - 1,
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Idle breathing / tail sway clock
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const tiltX = pointer.y * -6; // tilt head up when cursor goes up
  const tiltY = pointer.x * 8;
  const earL = Math.sin(t * 3) * 4 + pointer.x * 6;
  const earR = Math.sin(t * 3 + 1) * 4 + pointer.x * 6;
  const tailSway = Math.sin(t * 1.8) * 12 + pointer.x * 10;
  const breathe = 1 + Math.sin(t * 1.4) * 0.012;

  return (
    <div
      ref={wrapRef}
      className="relative select-none"
      style={{ width: size, height: size, perspective: 800 }}
    >
      {/* Soft gold glow behind */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(38 70% 60% / 0.45) 0%, transparent 65%)",
          transform: `scale(${1.2 + Math.sin(t * 1.4) * 0.04})`,
        }}
      />

      <div
        className="relative h-full w-full transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${breathe})`,
          transformStyle: "preserve-3d",
        }}
      >
        <img
          src={leopardSrc}
          alt="BizOrder leopard mark"
          width={size}
          height={size}
          className="h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.55)]"
          draggable={false}
        />

        {/* Left ear flicker */}
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "8%",
            left: "26%",
            width: "16%",
            height: "16%",
            background:
              "radial-gradient(circle, hsl(38 70% 65% / 0.55) 0%, transparent 70%)",
            transform: `rotate(${earL}deg) translateY(${Math.sin(t * 3) * 2}px)`,
            filter: "blur(6px)",
            borderRadius: "50%",
          }}
        />
        {/* Right ear flicker */}
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "8%",
            right: "26%",
            width: "16%",
            height: "16%",
            background:
              "radial-gradient(circle, hsl(38 70% 65% / 0.55) 0%, transparent 70%)",
            transform: `rotate(${-earR}deg) translateY(${Math.sin(t * 3 + 1) * 2}px)`,
            filter: "blur(6px)",
            borderRadius: "50%",
          }}
        />
        {/* Tail sway shimmer */}
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            bottom: "6%",
            right: "-4%",
            width: "30%",
            height: "10%",
            background:
              "linear-gradient(90deg, transparent, hsl(38 70% 60% / 0.5), transparent)",
            transform: `rotate(${tailSway}deg)`,
            transformOrigin: "left center",
            filter: "blur(4px)",
            borderRadius: "999px",
          }}
        />
      </div>
    </div>
  );
};

import { useEffect, useRef, useState } from "react";
import leopardPrint from "@/assets/leopard-print.jpg";

/**
 * Snow-leopard print wallpaper. Uses the uploaded reference image as a
 * tiled, fixed background. Reacts to pointer (hover/touch) and scroll
 * with subtle parallax. The tile is oversized and offset so seams never
 * appear inside the viewport.
 */
export const InteractiveDotsBackground = () => {
  const [isDark, setIsDark] = useState(false);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => setIsDark(root.classList.contains("dark"));
    updateTheme();
    const obs = new MutationObserver(updateTheme);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });

    const onScroll = () => {
      target.current.y = window.scrollY * 0.18;
    };

    const onPointer = (e: PointerEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      // Subtle pointer parallax: max ~24px shift
      target.current.x = ((e.clientX - cx) / cx) * 24;
      target.current.y =
        window.scrollY * 0.18 + ((e.clientY - cy) / cy) * 24;
    };

    const tick = () => {
      // Smoothly interpolate towards the target for buttery motion
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      const layer = layerRef.current;
      if (layer) {
        layer.style.transform = `translate3d(${-current.current.x}px, ${-current.current.y}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      obs.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/*
        Oversized tiling layer: extends 200px beyond every edge so any
        parallax shift never reveals a hard border. Uses background-repeat
        for a continuous print without visible seams.
      */}
      <div
        ref={layerRef}
        className="absolute"
        style={{
          top: "-200px",
          left: "-200px",
          right: "-200px",
          bottom: "-200px",
          backgroundImage: `url(${leopardPrint})`,
          backgroundRepeat: "repeat",
          backgroundSize: "clamp(260px, 36vw, 520px)",
          backgroundPosition: "center center",
          opacity: isDark ? 0.18 : 0.32,
          filter: isDark ? "invert(1) hue-rotate(180deg)" : "none",
          willChange: "transform",
          transition: "opacity 300ms ease",
        }}
      />
      {/* Soft fade so foreground content stays readable */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at center, transparent 0%, hsl(var(--background) / 0.55) 70%, hsl(var(--background) / 0.85) 100%)"
            : "radial-gradient(ellipse at center, transparent 0%, hsl(var(--background) / 0.4) 70%, hsl(var(--background) / 0.7) 100%)",
        }}
      />
    </div>
  );
};

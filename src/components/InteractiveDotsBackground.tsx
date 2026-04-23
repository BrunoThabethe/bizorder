import { useEffect, useRef } from "react";

export const InteractiveDotsBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isTouch = window.matchMedia("(hover: none)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;
    type Dot = { bx: number; by: number; x: number; y: number; r: number; base: number };
    let dots: Dot[] = [];

    const SPACING = 26;

    const build = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      const cols = Math.ceil(width / SPACING) + 2;
      const rows = Math.ceil(height / SPACING) + 2;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const bx = i * SPACING;
          const by = j * SPACING;
          const base = 0.18 + Math.random() * 0.22;
          dots.push({ bx, by, x: bx, y: by, r: 0.9, base });
        }
      }
    };

    const pointer = { x: -9999, y: -9999, active: false };
    let scrollOffset = 0;
    let scrollPulse = 0;
    let lastScrollY = window.scrollY;

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY;
      lastScrollY = y;
      scrollOffset = y;
      scrollPulse = Math.min(1, scrollPulse + Math.abs(delta) * 0.01);
    };
    const onResize = () => build();

    build();

    if (!isTouch) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    let raf = 0;
    const RADIUS = 140;
    const RADIUS_SQ = RADIUS * RADIUS;

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      const fgVar = getComputedStyle(document.documentElement)
        .getPropertyValue("--foreground")
        .trim() || "0 0% 8%";
      const fgHsl = fgVar.split(/\s+/).join(", ");

      scrollPulse *= 0.92;
      const drift = (scrollOffset * 0.06) % SPACING;

      for (let k = 0; k < dots.length; k++) {
        const d = dots[k];
        const baseY = d.by - drift;

        let alpha = d.base;
        let dx = d.bx;
        let dy = baseY;

        if (pointer.active) {
          const ox = d.bx - pointer.x;
          const oy = baseY - pointer.y;
          const distSq = ox * ox + oy * oy;
          if (distSq < RADIUS_SQ) {
            const dist = Math.sqrt(distSq);
            const force = 1 - dist / RADIUS;
            alpha = Math.min(1, d.base + force * 0.85);
            const push = force * 12;
            const nx = dist === 0 ? 0 : ox / dist;
            const ny = dist === 0 ? 0 : oy / dist;
            dx = d.bx + nx * push;
            dy = baseY + ny * push;
          }
        }

        if (isTouch && scrollPulse > 0.02) {
          alpha = Math.min(1, alpha + scrollPulse * 0.5);
        }

        ctx.fillStyle = `hsla(${fgHsl}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(dx, dy, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
    />
  );
};

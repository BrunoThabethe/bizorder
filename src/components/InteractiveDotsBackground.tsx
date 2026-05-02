import { useEffect, useRef } from "react";

/**
 * Snow-leopard rosette background. Each "dot" is actually a leopard
 * rosette: a ring of small petals around a darker center. Black & white
 * theme; pointer + scroll still drive the interaction.
 */
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

    type Rosette = {
      bx: number;
      by: number;
      base: number;
      ringRadius: number;
      petalRadius: number;
      petals: { angle: number; jitter: number }[];
      rotation: number;
    };
    let rosettes: Rosette[] = [];

    const SPACING = 56;

    const buildRosette = (bx: number, by: number): Rosette => {
      const ringRadius = 7 + Math.random() * 2.5;
      const petalRadius = 1.1 + Math.random() * 0.5;
      const count = 5 + Math.floor(Math.random() * 3); // 5–7 petals
      const petals = Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * Math.PI * 2,
        jitter: (Math.random() - 0.5) * 0.6,
      }));
      return {
        bx,
        by,
        base: 0.55 + Math.random() * 0.25,
        ringRadius,
        petalRadius,
        petals,
        rotation: Math.random() * Math.PI * 2,
      };
    };

    const build = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      rosettes = [];
      const cols = Math.ceil(width / SPACING) + 2;
      const rows = Math.ceil(height / SPACING) + 2;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          // Stagger every other row for a more organic spread
          const offset = j % 2 === 0 ? 0 : SPACING / 2;
          const bx = i * SPACING + offset + (Math.random() - 0.5) * 10;
          const by = j * SPACING + (Math.random() - 0.5) * 10;
          rosettes.push(buildRosette(bx, by));
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
    const RADIUS = 180;
    const RADIUS_SQ = RADIUS * RADIUS;

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      const fgVar = getComputedStyle(document.documentElement)
        .getPropertyValue("--foreground")
        .trim() || "0 0% 8%";
      const fgHsl = fgVar.split(/\s+/).join(", ");

      scrollPulse *= 0.92;
      const drift = (scrollOffset * 0.06) % SPACING;

      for (let k = 0; k < rosettes.length; k++) {
        const r = rosettes[k];
        const baseY = r.by - drift;

        let alpha = r.base;
        let cx = r.bx;
        let cy = baseY;
        let scale = 1;

        if (pointer.active) {
          const ox = r.bx - pointer.x;
          const oy = baseY - pointer.y;
          const distSq = ox * ox + oy * oy;
          if (distSq < RADIUS_SQ) {
            const dist = Math.sqrt(distSq);
            const force = 1 - dist / RADIUS;
            alpha = Math.min(1, r.base + force * 0.55);
            scale = 1 + force * 0.45;
            const push = force * 14;
            const nx = dist === 0 ? 0 : ox / dist;
            const ny = dist === 0 ? 0 : oy / dist;
            cx = r.bx + nx * push;
            cy = baseY + ny * push;
          }
        }

        if (isTouch && scrollPulse > 0.02) {
          alpha = Math.min(1, alpha + scrollPulse * 0.35);
          scale = 1 + scrollPulse * 0.2;
        }

        const ringR = r.ringRadius * scale;
        const petalR = r.petalRadius * scale;

        // Draw the ring of petals (the rosette)
        ctx.fillStyle = `hsla(${fgHsl}, ${alpha})`;
        for (let p = 0; p < r.petals.length; p++) {
          const petal = r.petals[p];
          const a = petal.angle + r.rotation + petal.jitter * 0.15;
          const px = cx + Math.cos(a) * ringR;
          const py = cy + Math.sin(a) * ringR;
          ctx.beginPath();
          ctx.arc(px, py, petalR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Tiny center dot — the leopard rosette's darker core
        ctx.fillStyle = `hsla(${fgHsl}, ${alpha * 0.75})`;
        ctx.beginPath();
        ctx.arc(cx, cy, petalR * 0.7, 0, Math.PI * 2);
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
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen opacity-70"
    />
  );
};

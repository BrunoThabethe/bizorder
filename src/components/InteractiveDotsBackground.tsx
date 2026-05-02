import { useEffect, useRef } from "react";

/**
 * Authentic snow-leopard rosette background. Each rosette is a broken,
 * irregular ring of black "petal" shards around a slightly darker grey
 * center — matching real snow-leopard print. Light theme: black on grey.
 * Dark theme: inverted (light shards on near-black). Pointer + scroll
 * still drive subtle motion.
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

    type Shard = {
      angle: number;       // position around the ring
      radius: number;      // distance from rosette center
      size: number;        // shard radius (px)
      stretch: number;     // elongation along the ring
      tilt: number;        // small rotation jitter
    };
    type Rosette = {
      bx: number;
      by: number;
      base: number;
      ringRadius: number;
      shards: Shard[];
      coreSize: number;
      rotation: number;
      hasCore: boolean;
    };
    let rosettes: Rosette[] = [];

    // Tighter spacing → denser print, like the reference image
    const SPACING = 78;

    const buildRosette = (bx: number, by: number): Rosette => {
      const ringRadius = 12 + Math.random() * 6; // bigger rosettes
      // 4–7 shards, with a gap (broken ring) like real leopard print
      const count = 4 + Math.floor(Math.random() * 4);
      // Pick a random "gap" angle so the ring isn't closed
      const gapStart = Math.random() * Math.PI * 2;
      const gapWidth = 0.6 + Math.random() * 0.9;

      const shards: Shard[] = [];
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        // Skip shards that fall in the gap
        const da = ((a - gapStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (da < gapWidth) continue;
        shards.push({
          angle: a,
          radius: ringRadius * (0.85 + Math.random() * 0.3),
          size: 3.2 + Math.random() * 2.4,
          stretch: 1.4 + Math.random() * 1.1,
          tilt: (Math.random() - 0.5) * 0.6,
        });
      }

      return {
        bx,
        by,
        base: 0.78 + Math.random() * 0.18,
        ringRadius,
        shards,
        coreSize: 2 + Math.random() * 2.2,
        rotation: Math.random() * Math.PI * 2,
        hasCore: Math.random() < 0.78,
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
          // Stagger every other row + heavy jitter for organic spread
          const offset = j % 2 === 0 ? 0 : SPACING / 2;
          const bx = i * SPACING + offset + (Math.random() - 0.5) * 22;
          const by = j * SPACING + (Math.random() - 0.5) * 22;
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
    const RADIUS = 200;
    const RADIUS_SQ = RADIUS * RADIUS;

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      // Use --foreground so light theme paints dark shards, dark theme paints light shards.
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
            alpha = Math.min(1, r.base + force * 0.25);
            scale = 1 + force * 0.35;
            const push = force * 12;
            const nx = dist === 0 ? 0 : ox / dist;
            const ny = dist === 0 ? 0 : oy / dist;
            cx = r.bx + nx * push;
            cy = baseY + ny * push;
          }
        }

        if (isTouch && scrollPulse > 0.02) {
          alpha = Math.min(1, alpha + scrollPulse * 0.25);
          scale = 1 + scrollPulse * 0.18;
        }

        // Soft grey core (the rosette interior)
        if (r.hasCore) {
          ctx.fillStyle = `hsla(${fgHsl}, ${alpha * 0.22})`;
          ctx.beginPath();
          ctx.arc(cx, cy, r.coreSize * scale, 0, Math.PI * 2);
          ctx.fill();
        }

        // Black/foreground shards forming the broken ring
        ctx.fillStyle = `hsla(${fgHsl}, ${alpha})`;
        for (let p = 0; p < r.shards.length; p++) {
          const s = r.shards[p];
          const a = s.angle + r.rotation;
          const px = cx + Math.cos(a) * s.radius * scale;
          const py = cy + Math.sin(a) * s.radius * scale;

          ctx.save();
          ctx.translate(px, py);
          // Orient the shard tangent to the ring + jitter
          ctx.rotate(a + Math.PI / 2 + s.tilt);
          ctx.beginPath();
          ctx.ellipse(0, 0, s.size * scale, s.size * scale * s.stretch, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
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
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen opacity-60"
    />
  );
};

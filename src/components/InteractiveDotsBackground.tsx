import { useEffect, useRef } from "react";

/**
 * Metallic / alien interactive particle field.
 * Dots are shaded with a chrome highlight + shadow and displaced by a slow
 * organic flow field plus a central spherical bulge, creating the look of a
 * liquid-metal blob from the reference image. Pointer interaction warps the
 * field locally.
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
    type Dot = { bx: number; by: number; r: number };
    let dots: Dot[] = [];

    const SPACING = 18;

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
          dots.push({ bx: i * SPACING, by: j * SPACING, r: 1.1 });
        }
      }
    };

    const pointer = { x: -9999, y: -9999, active: false };
    let scrollOffset = 0;

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
      scrollOffset = window.scrollY;
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
    const start = performance.now();

    const tick = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      const t = (now - start) * 0.00035;
      const drift = (scrollOffset * 0.05) % SPACING;

      // Center of the alien blob — slowly drifts
      const cx = width * 0.5 + Math.sin(t * 0.7) * width * 0.05;
      const cy = height * 0.5 + Math.cos(t * 0.5) * height * 0.05;
      const blobR = Math.min(width, height) * 0.42;

      for (let k = 0; k < dots.length; k++) {
        const d = dots[k];
        const baseY = d.by - drift;

        // Organic flow displacement
        const fx = Math.sin((d.bx + baseY) * 0.012 + t * 1.8) * 4;
        const fy = Math.cos((d.bx - baseY) * 0.014 + t * 1.5) * 4;

        let dx = d.bx + fx;
        let dy = baseY + fy;

        // Spherical bulge — push outward + lift toward camera near center
        const ox = dx - cx;
        const oy = dy - cy;
        const distC = Math.sqrt(ox * ox + oy * oy);
        const inSphere = distC < blobR;
        let depth = 0;
        if (inSphere) {
          const nd = distC / blobR;
          depth = Math.sqrt(1 - nd * nd); // 0..1, max at center
          const push = depth * 14;
          if (distC > 0.001) {
            dx += (ox / distC) * push;
            dy += (oy / distC) * push;
          }
        }

        // Pointer warp
        if (pointer.active) {
          const px = dx - pointer.x;
          const py = dy - pointer.y;
          const distSq = px * px + py * py;
          if (distSq < RADIUS_SQ) {
            const dist = Math.sqrt(distSq);
            const force = 1 - dist / RADIUS;
            const push = force * 22;
            const nx = dist === 0 ? 0 : px / dist;
            const ny = dist === 0 ? 0 : py / dist;
            dx += nx * push;
            dy += ny * push;
            depth = Math.min(1, depth + force * 0.6);
          }
        }

        // Chrome shading: cool dark base + bright highlight at top-left
        // Light direction normalized (-0.6, -0.6) on the bulge normal
        const normX = distC > 0.001 ? ox / Math.max(distC, 1) : 0;
        const normY = distC > 0.001 ? oy / Math.max(distC, 1) : 0;
        const lightDot = Math.max(0, -normX * 0.6 - normY * 0.6);
        const lit = Math.min(1, depth * 0.6 + lightDot * depth * 0.7);

        // Base alpha: stronger inside the blob, faint outside (ambient field)
        const baseAlpha = inSphere ? 0.25 + depth * 0.55 : 0.08;
        const alpha = Math.min(1, baseAlpha + lit * 0.35);

        // Cool steel hue: silver-cyan highlights, deep slate shadow
        // hue ~200 (cool), low sat, lightness driven by lit
        const lightness = 30 + lit * 65;
        const sat = 8 + depth * 12;
        ctx.fillStyle = `hsla(200, ${sat}%, ${lightness}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(dx, dy, d.r + depth * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight pip on lit dots
        if (lit > 0.55) {
          ctx.fillStyle = `hsla(195, 30%, 96%, ${(lit - 0.5) * 0.9})`;
          ctx.beginPath();
          ctx.arc(dx - 0.4, dy - 0.4, 0.55, 0, Math.PI * 2);
          ctx.fill();
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
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
    />
  );
};

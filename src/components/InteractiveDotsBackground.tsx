import { useEffect, useRef } from "react";

/**
 * Dense metallic dot wallpaper. Fills the entire viewport with a tight grid
 * of chrome-shaded dots that ripple subtly with an organic flow field and
 * warp locally around the pointer. No central sphere — uniform texture edge
 * to edge so it reads like a wallpaper on any screen size.
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
    type Dot = { bx: number; by: number };
    let dots: Dot[] = [];

    // Tight spacing for dense wallpaper texture
    const SPACING = 9;
    const DOT_R = 1.4;

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
          dots.push({ bx: i * SPACING, by: j * SPACING });
        }
      }
    };

    const pointer = { x: -9999, y: -9999, active: false };

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
    const onResize = () => build();

    build();

    if (!isTouch) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }
    window.addEventListener("resize", onResize);

    let raf = 0;
    const RADIUS = 160;
    const RADIUS_SQ = RADIUS * RADIUS;
    const start = performance.now();

    const tick = (now: number) => {
      // Solid base wash so the wallpaper looks continuous
      ctx.fillStyle = "hsl(210, 18%, 5%)";
      ctx.fillRect(0, 0, width, height);

      const t = (now - start) * 0.0004;

      for (let k = 0; k < dots.length; k++) {
        const d = dots[k];

        // Two overlapping wave fields produce slow rolling "liquid metal" highlights
        const wave1 = Math.sin(d.bx * 0.018 + d.by * 0.022 + t * 1.4);
        const wave2 = Math.cos(d.bx * 0.011 - d.by * 0.015 + t * 1.1);
        const field = (wave1 + wave2) * 0.5; // -1..1

        // Small organic displacement
        let dx = d.bx + wave1 * 1.6;
        let dy = d.by + wave2 * 1.6;

        let warpBoost = 0;

        // Pointer warp + brighten
        if (pointer.active) {
          const px = dx - pointer.x;
          const py = dy - pointer.y;
          const distSq = px * px + py * py;
          if (distSq < RADIUS_SQ) {
            const dist = Math.sqrt(distSq);
            const force = 1 - dist / RADIUS;
            const push = force * 18;
            const nx = dist === 0 ? 0 : px / dist;
            const ny = dist === 0 ? 0 : py / dist;
            dx += nx * push;
            dy += ny * push;
            warpBoost = force;
          }
        }

        // Chrome shading from the wave field (bright crests, dark troughs)
        const lit = (field + 1) * 0.5; // 0..1
        const lightness = 14 + lit * 78; // deep slate -> near white
        const sat = 6 + (1 - lit) * 8;
        const alpha = 0.55 + lit * 0.45 + warpBoost * 0.3;

        ctx.fillStyle = `hsla(200, ${sat}%, ${lightness}%, ${Math.min(1, alpha)})`;
        ctx.beginPath();
        ctx.arc(dx, dy, DOT_R + lit * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Specular pip on the brightest dots
        if (lit > 0.78 || warpBoost > 0.4) {
          const spec = Math.max(lit - 0.7, warpBoost * 0.6);
          ctx.fillStyle = `hsla(195, 25%, 98%, ${Math.min(1, spec * 1.2)})`;
          ctx.beginPath();
          ctx.arc(dx - 0.5, dy - 0.5, 0.6, 0, Math.PI * 2);
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

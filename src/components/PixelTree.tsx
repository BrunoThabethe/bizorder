import { useEffect, useRef } from "react";

/**
 * Pixel tree that grows from the ground up. Once branches finish, a small
 * snow-leopard climbs the trunk and rests on a fork before the cycle restarts.
 */
export const PixelTree = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const GRID = 110;
    const CYCLE_MS = 12000;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssSize = 0;
    let cell = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssSize = Math.min(rect.width, rect.height);
      cell = cssSize / GRID;
      canvas.width = Math.floor(cssSize * dpr);
      canvas.height = Math.floor(cssSize * dpr);
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement ?? canvas);

    type Pixel = { x: number; y: number; born: number; kind: "trunk" | "leaf" };
    type Branch = {
      x: number;
      y: number;
      angle: number;
      length: number;
      depth: number;
      progress: number;
      speed: number;
      done: boolean;
      children: Branch[];
    };

    const pixels: Pixel[] = [];

    // Trunk path used by the leopard to climb up
    const trunkPath: { x: number; y: number }[] = [];
    let restPoint: { x: number; y: number } | null = null;

    const buildTree = (): Branch => {
      const root: Branch = {
        x: GRID / 2,
        y: GRID - 6,
        angle: -Math.PI / 2,
        length: 22,
        depth: 0,
        progress: 0,
        speed: 0.018,
        done: false,
        children: [],
      };
      const grow = (b: Branch) => {
        if (b.depth >= 5) return;
        const splits = b.depth === 0 ? 2 : Math.random() < 0.55 ? 2 : 3;
        for (let i = 0; i < splits; i++) {
          const spread = 0.5 + Math.random() * 0.3;
          const dir = i === 0 ? -1 : i === 1 ? 1 : 0;
          const child: Branch = {
            x: 0,
            y: 0,
            angle: b.angle + dir * spread + (Math.random() - 0.5) * 0.2,
            length: b.length * (0.66 + Math.random() * 0.12),
            depth: b.depth + 1,
            progress: 0,
            speed: 0.02 + Math.random() * 0.025,
            done: false,
            children: [],
          };
          b.children.push(child);
          grow(child);
        }
      };
      grow(root);
      return root;
    };

    let tree = buildTree();
    let cycleStart = performance.now();

    const captureTrunkPath = (b: Branch, startX: number, startY: number) => {
      // Walk only the main trunk (first child each level) to give the leopard a clean route
      const endX = startX + Math.cos(b.angle) * b.length;
      const endY = startY + Math.sin(b.angle) * b.length;
      const steps = Math.max(2, Math.floor(b.length));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        trunkPath.push({
          x: startX + (endX - startX) * t,
          y: startY + (endY - startY) * t,
        });
      }
      if (b.children.length > 0) {
        // Pick the most upright child to follow
        let best = b.children[0];
        let bestUp = Math.sin(best.angle);
        for (const c of b.children) {
          const up = Math.sin(c.angle);
          if (up < bestUp) {
            best = c;
            bestUp = up;
          }
        }
        captureTrunkPath(best, endX, endY);
      } else {
        // Leopard rests at the top of the climbed trunk, just below the canopy
        restPoint = { x: endX, y: endY - 1.5 };
      }
    };

    const drawBranchPixels = (b: Branch, startX: number, startY: number, now: number) => {
      const reach = b.length * b.progress;
      const endX = startX + Math.cos(b.angle) * reach;
      const endY = startY + Math.sin(b.angle) * reach;

      const steps = Math.max(1, Math.floor(reach * 1.5));
      const thickness = Math.max(0, 4 - b.depth);
      const perpX = -Math.sin(b.angle);
      const perpY = Math.cos(b.angle);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = startX + (endX - startX) * t;
        const cy = startY + (endY - startY) * t;
        for (let w = -thickness; w <= thickness; w++) {
          const px = Math.round(cx + perpX * w);
          const py = Math.round(cy + perpY * w);
          if (!pixels.find((p) => p.x === px && p.y === py)) {
            pixels.push({ x: px, y: py, born: now, kind: "trunk" });
          }
        }
      }

      if (b.progress >= 1 && !b.done) {
        b.done = true;
        const tipX = startX + Math.cos(b.angle) * b.length;
        const tipY = startY + Math.sin(b.angle) * b.length;

        if (b.depth >= 2) {
          const stepsLeaves = Math.max(2, Math.floor(b.length / 1.8));
          for (let s = 0; s <= stepsLeaves; s++) {
            const t = s / stepsLeaves;
            const cx = startX + (tipX - startX) * t;
            const cy = startY + (tipY - startY) * t;
            const clusterCount = 10 + Math.floor(Math.random() * 6);
            const radius = 2.4 + Math.random() * 1.4;
            for (let l = 0; l < clusterCount; l++) {
              const a = Math.random() * Math.PI * 2;
              const r = Math.pow(Math.random(), 0.55) * radius;
              pixels.push({
                x: Math.round(cx + Math.cos(a) * r),
                y: Math.round(cy + Math.sin(a) * r - 0.3),
                born: now + l * 8 + s * 30,
                kind: "leaf",
              });
            }
          }
        }

        if (b.children.length === 0) {
          const canopySize = 5 + Math.random() * 2;
          const leafCount = 55 + Math.floor(Math.random() * 25);
          for (let l = 0; l < leafCount; l++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.pow(Math.random(), 0.5) * canopySize;
            pixels.push({
              x: Math.round(tipX + Math.cos(a) * r),
              y: Math.round(tipY + Math.sin(a) * r - 0.6),
              born: now + l * 5,
              kind: "leaf",
            });
          }
        }
      }

      if (b.children.length > 0 && b.progress > 0.7) {
        const childStartX = startX + Math.cos(b.angle) * b.length;
        const childStartY = startY + Math.sin(b.angle) * b.length;
        for (const child of b.children) {
          drawBranchPixels(child, childStartX, childStartY, now);
        }
      }
    };

    const advance = (b: Branch, dt: number) => {
      if (b.progress < 1) {
        b.progress = Math.min(1, b.progress + b.speed * dt);
      }
      if (b.progress > 0.7) {
        for (const c of b.children) advance(c, dt);
      }
    };

    // Snow leopard sprite, drawn around (cx, cy) in grid cells.
    // White body + black rosettes. `facing` flips horizontally.
    const drawLeopard = (cx: number, cy: number, facing: 1 | -1, sitting: boolean, fg: string) => {
      const f = facing;
      // Body shape (relative grid coords). y is downward.
      const body: { dx: number; dy: number }[] = sitting
        ? [
            // crouched/sitting profile
            { dx: -3, dy: 0 }, { dx: -2, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 },
            { dx: -3, dy: 1 }, { dx: -2, dy: 1 }, { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 2, dy: 1 },
            { dx: -2, dy: 2 }, { dx: -1, dy: 2 }, { dx: 0, dy: 2 }, { dx: 1, dy: 2 }, { dx: 2, dy: 2 },
            // head
            { dx: 2, dy: -1 }, { dx: 3, dy: -1 }, { dx: 2, dy: 0 }, { dx: 3, dy: 0 },
            // ears
            { dx: 2, dy: -2 }, { dx: 3, dy: -2 },
            // tail curling up
            { dx: -4, dy: 0 }, { dx: -5, dy: -1 }, { dx: -5, dy: -2 }, { dx: -4, dy: -2 },
            // legs tucked
            { dx: -2, dy: 3 }, { dx: -1, dy: 3 }, { dx: 1, dy: 3 }, { dx: 2, dy: 3 },
          ]
        : [
            // climbing/stretched profile
            { dx: -3, dy: 0 }, { dx: -2, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 },
            { dx: -3, dy: 1 }, { dx: -2, dy: 1 }, { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 2, dy: 1 },
            // head reaching up
            { dx: 3, dy: -1 }, { dx: 3, dy: 0 }, { dx: 4, dy: 0 },
            // ears
            { dx: 3, dy: -2 },
            // tail trailing
            { dx: -4, dy: 1 }, { dx: -5, dy: 1 }, { dx: -6, dy: 0 },
            // limbs gripping
            { dx: -2, dy: 2 }, { dx: 0, dy: 2 }, { dx: 2, dy: 2 },
          ];

      // White body fill
      ctx.fillStyle = `hsl(0 0% 96%)`;
      for (const p of body) {
        const x = Math.round(cx + p.dx * f);
        const y = Math.round(cy + p.dy);
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }

      // Black rosettes — single dark pixels scattered on the body
      const spots: { dx: number; dy: number }[] = sitting
        ? [
            { dx: -2, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 2 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: -3, dy: 1 },
            { dx: 2, dy: 1 }, { dx: -1, dy: 2 },
          ]
        : [
            { dx: -2, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 1 },
            { dx: -1, dy: 1 }, { dx: -3, dy: 1 }, { dx: 2, dy: 0 },
          ];
      ctx.fillStyle = `hsl(${fg} / 0.92)`;
      for (const p of spots) {
        const x = Math.round(cx + p.dx * f);
        const y = Math.round(cy + p.dy);
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }

      // Eye dot
      ctx.fillStyle = `hsl(${fg})`;
      ctx.fillRect(Math.round(cx + 3 * f) * cell, Math.round(cy - 1) * cell, cell, cell);
    };

    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.67);
      last = now;

      const cycleElapsed = now - cycleStart;
      const cyclePos = cycleElapsed / CYCLE_MS;

      // Phase 1 (0 → 0.45): grow tree
      // Phase 2 (0.45 → 0.85): leopard climbs and rests
      // Phase 3 (0.85 → 1): fade out and reset

      if (cyclePos < 0.55) {
        advance(tree, dt);
        drawBranchPixels(tree, tree.x, tree.y, now);
      }

      if (cyclePos >= 1) {
        cycleStart = now;
        pixels.length = 0;
        trunkPath.length = 0;
        restPoint = null;
        tree = buildTree();
      }

      const styles = getComputedStyle(document.documentElement);
      const fg = styles.getPropertyValue("--foreground").trim() || "0 0% 100%";

      ctx.clearRect(0, 0, cssSize, cssSize);

      const groundY = GRID - 5;
      ctx.fillStyle = `hsl(${fg} / 0.35)`;
      for (let x = 6; x < GRID - 6; x += 2) {
        ctx.fillRect(x * cell, groundY * cell, cell, cell);
      }

      const fadeOut = cyclePos > 0.9 ? Math.max(0, 1 - (cyclePos - 0.9) / 0.1) : 1;

      for (const p of pixels) {
        if (now < p.born) continue;
        if (p.x < 0 || p.x >= GRID || p.y < 0 || p.y >= GRID) continue;
        const age = now - p.born;
        const appear = Math.min(1, age / 220);
        let alpha = appear * fadeOut;
        if (p.kind === "leaf") alpha *= 0.9;
        ctx.fillStyle = `hsl(${fg} / ${alpha.toFixed(3)})`;
        ctx.fillRect(p.x * cell, p.y * cell, cell, cell);
      }

      // Build trunk path once tree is mostly grown
      if (cyclePos > 0.5 && trunkPath.length === 0) {
        captureTrunkPath(tree, tree.x, tree.y);
      }

      // Leopard climbs after tree, then sits at rest point
      if (cyclePos > 0.5 && trunkPath.length > 0 && fadeOut > 0) {
        const climbStart = 0.55;
        const climbEnd = 0.8;
        const climbT = Math.max(0, Math.min(1, (cyclePos - climbStart) / (climbEnd - climbStart)));
        if (climbT < 1) {
          const idx = Math.floor(climbT * (trunkPath.length - 1));
          const next = trunkPath[Math.min(idx + 1, trunkPath.length - 1)];
          const cur = trunkPath[idx];
          // Face the direction of travel
          const facing: 1 | -1 = next.x >= cur.x ? 1 : -1;
          drawLeopard(cur.x, cur.y - 1, facing, false, fg);
        } else if (restPoint) {
          drawLeopard(restPoint.x, restPoint.y, 1, true, fg);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className="relative aspect-square w-full max-w-[560px]"
      aria-label="Animated pixel tree with a snow leopard climbing it"
      role="img"
    >
      <canvas ref={canvasRef} className="h-full w-full [image-rendering:pixelated]" />
    </div>
  );
};

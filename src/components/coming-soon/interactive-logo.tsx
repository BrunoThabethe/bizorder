import { useEffect, useRef, useState } from "react";
import logoSrc from "@/assets/bon-logo.png";

type InteractiveLogoProps = {
  size?: number;
};

export const InteractiveLogo = ({ size = 180 }: InteractiveLogoProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [t, setT] = useState(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPointer({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

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

  const tiltX = pointer.y * -8;
  const tiltY = pointer.x * 10;
  const breathe = 1 + Math.sin(t * 1.4) * 0.015;

  return (
    <div
      ref={wrapRef}
      className="relative select-none"
      style={{ width: size, height: size, perspective: 900 }}
    >
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(38 63% 60% / 0.45) 0%, transparent 65%)",
          transform: `scale(${1.15 + Math.sin(t * 1.4) * 0.05})`,
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
          src={logoSrc}
          alt="BizOrder logo"
          width={size}
          height={size}
          className="h-full w-full object-contain drop-shadow-[0_18px_30px_rgba(58,44,31,0.25)]"
          draggable={false}
        />
      </div>
    </div>
  );
};

import { useEffect, useState } from "react";
import leopardPrint from "@/assets/leopard-print.jpg";

/**
 * Snow-leopard print wallpaper. Uses the uploaded reference image as a
 * tiled, fixed background. On dark theme the image is inverted so the
 * print stays readable. Subtle parallax on scroll for life.
 */
export const InteractiveDotsBackground = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });

    const root = document.documentElement;
    const updateTheme = () => setIsDark(root.classList.contains("dark"));
    updateTheme();
    const obs = new MutationObserver(updateTheme);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      window.removeEventListener("scroll", onScroll);
      obs.disconnect();
    };
  }, []);

  // Responsive tile size: smaller on mobile, larger on desktop.
  // The image repeats seamlessly across the viewport.
  const parallax = scrollY * 0.15;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-repeat"
        style={{
          backgroundImage: `url(${leopardPrint})`,
          backgroundSize: "clamp(220px, 32vw, 460px)",
          backgroundPosition: `0px ${-parallax}px`,
          opacity: isDark ? 0.18 : 0.32,
          filter: isDark ? "invert(1) hue-rotate(180deg)" : "none",
          transition: "opacity 300ms ease",
        }}
      />
      {/* Soft fade so content stays readable */}
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

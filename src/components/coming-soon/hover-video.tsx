import { useRef, useState } from "react";
import { Play } from "lucide-react";

const VIDEO_SRC = "/marketing/bizorder-teaser.mp4";

export const HoverVideo = () => {
  const ref = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [playing, setPlaying] = useState(false);

  const start = () => {
    const v = ref.current;
    if (!v) return;
    v.play()
      .then(() => setPlaying(true))
      .catch(() => undefined);
  };

  const stop = () => {
    const v = ref.current;
    if (!v) return;
    v.pause();
    setPlaying(false);
  };

  return (
    <div
      className="group relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-3xl"
      onMouseEnter={start}
      onMouseLeave={stop}
      onTouchStart={() => (playing ? stop() : start())}
    >
      {!hasError ? (
        <video
          ref={ref}
          src={VIDEO_SRC}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2a1f15] via-[#3a2c1f] to-[#1a130c]">
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-primary">Teaser coming soon</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Drop your video at <code className="text-primary">public/marketing/bizorder-teaser.mp4</code>
            </p>
          </div>
        </div>
      )}

      {/* Soft ambient gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[40px] opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(38 70% 60% / 0.35) 0%, transparent 70%)",
        }}
      />

      {/* Hover-to-play hint */}
      {!playing && !hasError && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30 opacity-100 transition-opacity duration-500 group-hover:opacity-0">
          <div className="flex items-center gap-3 rounded-full border border-white/20 bg-black/40 px-5 py-2 backdrop-blur-md">
            <Play className="h-4 w-4 text-primary" fill="currentColor" />
            <span className="text-sm font-medium text-white">Hover to play</span>
          </div>
        </div>
      )}
    </div>
  );
};

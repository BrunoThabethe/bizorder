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
      className="group relative mx-auto aspect-video w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card-gradient shadow-card-lift md:rounded-3xl"
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
        <div className="grid h-full w-full place-items-center">
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-primary">
              Teaser coming soon
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Watch this space for the launch trailer.
            </p>
          </div>
        </div>
      )}

      {!playing && !hasError && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-primary/10 opacity-100 transition-opacity duration-500 group-hover:opacity-0">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 shadow-card-lift">
            <Play className="h-3.5 w-3.5 text-primary" fill="currentColor" />
            <span className="text-xs font-medium text-foreground md:text-sm">Hover to play</span>
          </div>
        </div>
      )}
    </div>
  );
};

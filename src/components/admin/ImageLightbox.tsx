import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { signOrderMedia } from "@/lib/business/queries";
import { cn } from "@/lib/utils";

type ImageLightboxProps = {
  path: string | null;
  onClose: () => void;
};

/**
 * Full-screen image viewer that resolves a private storage path to a signed URL
 * and lets the admin zoom in. Click anywhere to close.
 */
export const ImageLightbox = ({ path, onClose }: ImageLightboxProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      setZoomed(false);
      return;
    }
    if (/^https?:\/\//.test(path)) {
      setUrl(path);
      return;
    }
    let active = true;
    signOrderMedia([path], 3600)
      .then((urls) => {
        if (active) setUrl(urls[0] ?? null);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [path]);

  useEffect(() => {
    if (!path) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path, onClose]);

  if (!path) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-background/90 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-foreground text-background shadow-lg"
        aria-label="Close image"
      >
        <X className="h-5 w-5" />
      </button>
      {url ? (
        <img
          src={url}
          alt="Proof"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
          className={cn(
            "max-h-[90vh] max-w-[95vw] cursor-zoom-in rounded-2xl object-contain shadow-2xl transition-transform duration-300",
            zoomed && "scale-150 cursor-zoom-out",
          )}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Loading proof…</p>
      )}
    </div>
  );
};

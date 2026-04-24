import { useEffect, useState } from "react";
import { signOrderMedia } from "@/lib/business/queries";

type SignedImageProps = {
  path: string;
  alt: string;
  className?: string;
};

/**
 * Resolves a private order-media object path to a short-lived signed URL
 * and renders it as an image. Falls back to a muted placeholder while loading.
 */
export const SignedImage = ({ path, alt, className }: SignedImageProps) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Tolerate legacy public URLs that may already be present in older rows.
    if (/^https?:\/\//.test(path)) {
      setUrl(path);
      return;
    }
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

  if (!url) return <div className={className} aria-label={alt} />;
  return <img src={url} alt={alt} className={className} loading="lazy" />;
};

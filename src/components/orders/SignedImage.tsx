import { useQuery } from "@tanstack/react-query";
import { signOrderMedia } from "@/lib/business/queries";
import { cacheTiers, queryKeys } from "@/lib/cache";

type SignedImageProps = {
  path: string;
  alt: string;
  className?: string;
};

/**
 * Resolves a private order-media object path to a short-lived signed URL
 * and renders it as an image.
 *
 * Caching: signed URLs are stored under `queryKeys.signedMedia(...)` with a
 * 50-minute staleTime, so the same path is signed once per ~hour even when it
 * appears in many places (order detail, dispute, admin uploads page, etc.).
 */
export const SignedImage = ({ path, alt, className }: SignedImageProps) => {
  const isLegacyPublic = /^https?:\/\//.test(path);

  const { data: url } = useQuery({
    queryKey: queryKeys.signedMedia("order-media", path),
    enabled: !isLegacyPublic && !!path,
    ...cacheTiers.signedUrl,
    queryFn: async () => {
      const [signed] = await signOrderMedia([path], 3600);
      return signed ?? null;
    },
  });

  const src = isLegacyPublic ? path : url;
  if (!src) return <div className={className} aria-label={alt} />;
  return <img src={src} alt={alt} className={className} loading="lazy" />;
};

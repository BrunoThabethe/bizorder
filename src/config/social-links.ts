// Centralised social media links. Replace `#` with real URLs when ready.
export type SocialPlatform = "instagram" | "x" | "facebook" | "tiktok" | "linkedin";

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  href: string;
}

export const socialLinks: ReadonlyArray<SocialLink> = [
  { platform: "instagram", label: "Instagram", href: "#" },
  { platform: "x", label: "X (Twitter)", href: "#" },
  { platform: "facebook", label: "Facebook", href: "#" },
  { platform: "tiktok", label: "TikTok", href: "#" },
  { platform: "linkedin", label: "LinkedIn", href: "#" },
];

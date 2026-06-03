// Centralised social media links. Replace `#` with real URLs when ready.
export type SocialPlatform = "instagram" | "x" | "facebook" | "tiktok" | "linkedin";

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  href: string;
}

export const socialLinks: ReadonlyArray<SocialLink> = [
  {
    platform: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/bizordernexus?igsh=MXJmZnU2ZTZ2dTVmdA==",
  },
  { platform: "x", label: "X (Twitter)", href: "https://x.com/bizordernexus?s=11" },
  { platform: "facebook", label: "Facebook", href: "https://www.facebook.com/share/1DKCX6iv8k/?mibextid=wwXIfr" },
  { platform: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@bizorder.nexus?_r=1&_t=ZS-960C5ZOSym4" },
  {
    platform: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/bizorder-nexus-b68582413?utm_source=share_via&utm_content=profile&utm_medium=member_ios",
  },
];

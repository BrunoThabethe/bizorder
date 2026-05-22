import { Facebook, Instagram, Linkedin, Music2, Twitter } from "lucide-react";
import { socialLinks, type SocialPlatform } from "@/config/social-links";

const ICONS: Record<SocialPlatform, typeof Instagram> = {
  instagram: Instagram,
  x: Twitter,
  facebook: Facebook,
  tiktok: Music2,
  linkedin: Linkedin,
};

export const SocialRow = () => {
  return (
    <nav aria-label="Follow us" className="flex items-center justify-center gap-3">
      {socialLinks.map((link) => {
        const Icon = ICONS[link.platform];
        return (
          <a
            key={link.platform}
            href={link.href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={link.label}
            className="group grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-foreground/80 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-primary/60 hover:bg-primary/15 hover:text-primary hover:shadow-[0_8px_24px_-8px_hsl(38_70%_60%/0.6)]"
          >
            <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
          </a>
        );
      })}
    </nav>
  );
};

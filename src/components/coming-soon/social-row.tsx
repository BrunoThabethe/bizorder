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
            className="grid h-11 w-11 place-items-center rounded-full border border-border/60 bg-card text-primary transition-all duration-300 hover:scale-110 hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-card-lift"
          >
            <Icon className="h-4 w-4" />
          </a>
        );
      })}
    </nav>
  );
};

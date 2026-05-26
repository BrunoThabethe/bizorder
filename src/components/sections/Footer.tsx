import { BrandMark } from "@/components/BrandMark";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

const productLinks = [
  { label: "How it works", to: "/how-it-works" },
  { label: "For businesses", to: "/for-businesses" },
  { label: "For customers", to: "/for-customers" },
  { label: "Coming soon", to: "/coming-soon" },
];

const supportLinks = [
  { label: "Contact", to: "/contact" },
  { label: "Sign in", to: "/login" },
  { label: "Create account", to: "/signup" },
];

const legalLinks = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "Refunds", to: "/refunds" },
  { label: "Platform rules", to: "/rules" },
];

export const Footer = () => {
  return (
    <footer className="relative border-t border-foreground/10 py-14 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <BrandMark size={40} />
              <span className="font-display text-xl font-bold">BizOrder</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The simplest way to take orders, get paid, and grow your business online.
            </p>
          </div>

          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Support" links={supportLinks} />
          <FooterColumn title="Legal" links={legalLinks} />
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-foreground/10 pt-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} BizOrder. Built to sell.</p>
          <p>Transparency · Accountability · Impartiality · Responsiveness · Integrity</p>
        </div>
      </div>
    </footer>
  );
};

type FooterColumnProps = {
  title: string;
  links: { label: string; to: string }[];
};

const FooterColumn = ({ title, links }: FooterColumnProps) => (
  <div>
    <p className="font-display text-sm font-bold uppercase tracking-wider text-foreground">{title}</p>
    <ul className="mt-4 space-y-2 text-sm">
      {links.map((l) => (
        <li key={l.to}>
          <Link to={l.to} className="text-muted-foreground transition-colors hover:text-foreground">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

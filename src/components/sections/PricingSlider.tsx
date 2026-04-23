import { Check, Sparkles, Crown, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

type Plan = {
  name: string;
  tag: string;
  price: string;
  period: string;
  icon: typeof Check;
  highlight?: boolean;
  features: string[];
  cta: string;
};

const plans: Plan[] = [
  {
    name: "Starter",
    tag: "For new sellers",
    price: "R0",
    period: "free forever",
    icon: Sparkles,
    features: ["Up to 10 products", "Order management", "Customer messages", "Basic profile page"],
    cta: "Start free",
  },
  {
    name: "Growth",
    tag: "Most businesses pick this",
    price: "R299",
    period: "/ month",
    icon: Rocket,
    highlight: true,
    features: [
      "Unlimited products",
      "Faster checkout",
      "WhatsApp + email alerts",
      "Reviews & ratings",
      "Priority support",
      "Verified badge",
    ],
    cta: "Get growing",
  },
  {
    name: "Pro",
    tag: "For busy teams",
    price: "R799",
    period: "/ month",
    icon: Crown,
    features: [
      "Everything in Growth",
      "Crew accounts (up to 10)",
      "Advanced analytics",
      "Custom branding",
      "Featured placement",
      "1-on-1 onboarding",
    ],
    cta: "Go pro",
  },
];

const slides = [...plans, ...plans];

export const PricingSlider = () => {
  return (
    <section id="pricing" className="relative py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-foreground/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Simple pricing
          </span>
          <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">
            Pick a plan. <span className="text-foreground/60">Start selling.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No setup fees. Cancel anytime. Upgrade when you grow.
          </p>
        </div>
      </div>

      <div className="relative mt-14 marquee-pause overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />

        <div className="marquee gap-6 px-4">
          {slides.map((plan, i) => (
            <PlanCard key={i} plan={plan} />
          ))}
        </div>
      </div>

      <div className="container mx-auto mt-12 px-4 text-center">
        <Button size="lg" asChild>
          <a href="/pricing">See full pricing details</a>
        </Button>
      </div>
    </section>
  );
};

const PlanCard = ({ plan }: { plan: Plan }) => {
  const Icon = plan.icon;
  return (
    <div
      className={`relative w-[320px] shrink-0 rounded-3xl p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${
        plan.highlight ? "bg-foreground/10" : "bg-background/30"
      }`}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-1 text-xs font-bold uppercase tracking-wider text-background">
          Best value
        </span>
      )}
      <div
        className={`grid h-12 w-12 place-items-center rounded-xl ${
          plan.highlight ? "bg-foreground text-background" : "bg-foreground/10 text-foreground"
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 font-display text-2xl font-bold">{plan.name}</h3>
      <p className="text-sm text-muted-foreground">{plan.tag}</p>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="font-display text-5xl font-bold">{plan.price}</span>
        <span className="text-sm text-muted-foreground">{plan.period}</span>
      </div>

      <ul className="mt-6 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" strokeWidth={3} />
            <span className="text-foreground">{f}</span>
          </li>
        ))}
      </ul>

      <Button variant={plan.highlight ? "default" : "bright"} className="mt-7 w-full" size="lg">
        {plan.cta}
      </Button>
    </div>
  );
};

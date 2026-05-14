import { Star } from "lucide-react";

const reviews = [
  {
    quote: "Went from 3 orders a week to 27. BizOrder paid for itself in 4 days.",
    name: "Lerato M.",
    role: "Bakery owner",
  },
  {
    quote: "I'm not techy. Set everything up in one afternoon. My customers love it.",
    name: "Sipho K.",
    role: "Car detailing",
  },
  {
    quote: "Finally stopped losing WhatsApp orders. Everything in one clean inbox.",
    name: "Anika P.",
    role: "Salon owner",
  },
];

export const SocialProof = () => {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Real businesses. <span className="text-primary">Real growth.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <figure
              key={r.name}
              className="rounded-2xl border border-border/60 bg-card-gradient p-7 shadow-card-lift transition-transform duration-300 hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="flex gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 font-display text-lg leading-snug">"{r.quote}"</blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-bold">{r.name}</span>
                <span className="text-muted-foreground"> · {r.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

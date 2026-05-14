import { AlertTriangle, TrendingDown, Clock, Eye } from "lucide-react";

const pains = [
  {
    icon: TrendingDown,
    title: "Empty cart, empty bank account",
    text: "Your competitors are selling online. You're still waiting for the phone to ring.",
  },
  {
    icon: Eye,
    title: "Invisible to buyers",
    text: "If customers can't find you on Google, they're buying from someone else.",
  },
  {
    icon: Clock,
    title: "Stuck taking orders by hand",
    text: "WhatsApp chaos, lost messages, missed payments — every day costs you sales.",
  },
  {
    icon: AlertTriangle,
    title: "Broken or ugly website?",
    text: "A bad site loses 70% of visitors in 5 seconds. That's money walking away.",
  },
];

export const Pains = () => {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            The painful truth
          </span>
          <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">
            Every day without BizOrder is{" "}
            <span className="text-primary">money lost.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            These are the real reasons businesses fail online. Sound familiar?
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pains.map((p) => (
            <div
              key={p.title}
              className="group rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card-lift transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold leading-tight">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

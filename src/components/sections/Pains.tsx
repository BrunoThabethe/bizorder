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
          <span className="inline-block rounded-full bg-foreground/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            The painful truth
          </span>
          <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">
            Every day without BizOrder is{" "}
            <span className="text-foreground/60">money lost.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            These are the real reasons businesses fail online. Sound familiar?
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pains.map((p) => (
            <div
              key={p.title}
              className="group rounded-2xl bg-background/30 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-background/50"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-foreground/10 text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
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

import { ArrowRight, TrendingUp, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PixelTree } from "@/components/PixelTree";

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="container relative mx-auto px-4">
        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-primary animate-pulse" />
              Trusted by 1,200+ businesses
            </span>

            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] md:text-6xl lg:text-7xl">
              No website?<br />
              <span className="text-muted-foreground">No sales.</span><br />
              <span className="text-primary">We fix that.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
              Stop losing customers to slow checkouts, broken pages, and zero
              online presence. BizOrder gets your business ready to sell —
              <span className="font-semibold text-foreground"> in 24 hours.</span>
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="xl" asChild>
                <Link to="/signup">
                  Start selling today <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/how-it-works">See how it works</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span><span className="font-bold text-foreground">3.2x</span> more orders in 30 days</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>Live in <span className="font-bold text-foreground">24 hours</span></span>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center animate-fade-in">
            <PixelTree />

            <div className="absolute left-0 top-4 rounded-2xl border border-border/60 bg-card-gradient px-5 py-4 shadow-card-lift">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">New order</p>
              <p className="mt-1 font-display text-2xl font-bold text-primary">+R 1,240</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">2 minutes ago</p>
            </div>

            <div className="absolute bottom-4 right-0 rounded-2xl border border-border/60 bg-card-gradient px-5 py-4 shadow-card-lift">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Conversion</p>
              <p className="mt-1 font-display text-2xl font-bold text-primary">↑ 218%</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Last 30 days</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

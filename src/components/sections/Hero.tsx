import { ArrowRight, ShieldCheck, PackageCheck } from "lucide-react";
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
              Secure order fulfilment & tracking
            </span>

            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] md:text-6xl lg:text-7xl">
              Customers want proof.<br />
              <span className="text-muted-foreground">Businesses need trust.</span><br />
              <span className="text-primary">BizOrder Nexus connects both.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
              A secure order fulfilment and tracking platform designed for businesses
              <span className="font-semibold text-foreground"> and the customers who buy from them.</span>
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="xl" asChild>
                <Link to="/signup">
                  Get started <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/how-it-works">See how it works</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Verified businesses only</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-primary" />
                <span>Tracked from order to delivery</span>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center animate-fade-in">
            <PixelTree />
          </div>
        </div>
      </div>
    </section>
  );
};

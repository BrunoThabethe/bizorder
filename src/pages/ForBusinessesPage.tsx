import { ArrowRight, Store, BarChart3, Bell, Wallet, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { CtaForm } from "@/components/sections/CtaForm";

const benefits = [
  { icon: Store, title: "Your storefront, ready to sell", text: "A clean, fast-loading page that turns visitors into orders." },
  { icon: Bell, title: "Never miss an order", text: "Instant alerts on WhatsApp and email the moment a customer buys." },
  { icon: Wallet, title: "Get paid on time", text: "Built-in payments and payouts. No more chasing invoices." },
  { icon: BarChart3, title: "See what's working", text: "Simple dashboards show your top sellers and busiest days." },
  { icon: Users, title: "Manage your crew", text: "Add team members, assign jobs, track who did what." },
  { icon: Shield, title: "Verified and trusted", text: "A verified badge tells customers you're the real deal." },
];

const ForBusinessesPage = () => {
  return (
    <SiteLayout>
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block rounded-full bg-foreground/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">For businesses</span>
          <h1 className="mt-5 font-display text-5xl font-bold md:text-6xl">
            Sell more.<br /><span className="text-foreground/60">Stress less.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            BizOrder is the simplest way to take your business online and start getting real, paying orders — fast.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="xl" asChild><Link to="/signup">Get started <ArrowRight className="h-5 w-5" /></Link></Button>
            <Button size="xl" variant="outline" asChild><Link to="/how-it-works">How it works</Link></Button>
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl bg-background/30 p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-background/50">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-foreground/10 text-foreground">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaForm />
    </SiteLayout>
  );
};

export { ForBusinessesPage };
export default ForBusinessesPage;

import { ArrowRight, Search, MessageCircle, Truck, Star, ShieldCheck, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";

const perks = [
  { icon: Search, title: "Find local businesses fast", text: "Browse verified providers near you in seconds." },
  { icon: MessageCircle, title: "Chat directly", text: "Send references, ask questions, get clear answers — all in one place." },
  { icon: Clock, title: "Track every step", text: "Know exactly when your order is accepted, in progress, and ready." },
  { icon: Truck, title: "Pickup or delivery", text: "Choose what works best for you. No surprises." },
  { icon: ShieldCheck, title: "Safe payments", text: "Your money is protected until the job is done right." },
  { icon: Star, title: "Honest reviews", text: "Real ratings from real customers help you choose with confidence." },
];

const ForCustomersPage = () => {
  return (
    <SiteLayout>
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block rounded-full bg-foreground/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">For customers</span>
          <h1 className="mt-5 font-display text-5xl font-bold md:text-6xl">
            Order from real businesses.<br /><span className="text-foreground/60">Pay safely. Get it done.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            BizOrder connects you with trusted local businesses. Place an order, track it live, and only pay when you're happy.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="xl" asChild><Link to="/signup">Browse businesses <ArrowRight className="h-5 w-5" /></Link></Button>
            <Button size="xl" variant="outline" asChild><Link to="/how-it-works">How it works</Link></Button>
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((p) => (
              <div key={p.title} className="rounded-2xl bg-background/30 p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-background/50">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-foreground/10 text-foreground">
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

export { ForCustomersPage };
export default ForCustomersPage;

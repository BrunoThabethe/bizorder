import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Truck, Users, Store, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const roles = [
  {
    icon: ShoppingBag,
    title: "Customers",
    description: "Discover verified businesses and order with one tap.",
  },
  {
    icon: Store,
    title: "Businesses",
    description: "Manage products, orders, and your crew from one place.",
  },
  {
    icon: ShieldCheck,
    title: "Admin",
    description: "Approve businesses, monitor activity, keep things safe.",
  },
];

const features = [
  { icon: Sparkles, title: "Lightning fast", body: "Built on a lean stack so the app stays snappy as you grow." },
  { icon: Users, title: "Crew sub-portal", body: "Let your workers manage their assigned tasks — without admin access." },
  { icon: Truck, title: "Delivery ready", body: "Architecture is set up for delivery roles in the next release." },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const dashboardPath = role === "admin" ? "/admin" : role === "business" ? "/business" : "/dashboard";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="bg-gradient-primary inline-block h-7 w-7 rounded-lg shadow-glow" />
            <span className="font-display text-lg font-bold">BizOrder</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#roles" className="text-sm text-muted-foreground transition-smooth hover:text-foreground">Roles</a>
            <a href="#features" className="text-sm text-muted-foreground transition-smooth hover:text-foreground">Features</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button variant="hero" onClick={() => navigate(dashboardPath)}>
                Open dashboard <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="glass" onClick={() => navigate("/auth")}>Sign in</Button>
                <Button variant="hero" onClick={() => navigate("/auth")}>Get started</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="container relative py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur animate-fade-up">
              <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-primary" />
              Role-based marketplace platform
            </div>
            <h1 className="mb-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl animate-fade-up" style={{ animationDelay: "100ms" }}>
              Connect customers with{" "}
              <span className="text-gradient">verified businesses</span>
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "200ms" }}>
              BizOrder brings customers, businesses, and admins together in one secure, scalable platform — with a crew sub-portal built in.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: "300ms" }}>
              <Button size="lg" variant="hero" onClick={() => navigate("/auth")}>
                Start for free <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="glass" asChild>
                <a href="#roles">See how it works</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="container py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold md:text-4xl">Three dashboards. One platform.</h2>
          <p className="text-muted-foreground">Built for everyone who keeps a marketplace running.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((r) => (
            <div key={r.title} className="group rounded-2xl border border-border bg-gradient-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-smooth group-hover:bg-primary group-hover:text-primary-foreground">
                <r.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{r.title}</h3>
              <p className="text-sm text-muted-foreground">{r.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border/60 bg-card/40 p-6">
              <f.icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-card p-12 text-center shadow-elevated">
          <div className="absolute inset-0 bg-hero opacity-60" />
          <div className="relative">
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">Ready to launch?</h2>
            <p className="mx-auto mb-8 max-w-md text-muted-foreground">
              Create your account in under a minute and pick your role.
            </p>
            <Button size="lg" variant="hero" onClick={() => navigate("/auth")}>
              Create your account <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} BizOrder. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;

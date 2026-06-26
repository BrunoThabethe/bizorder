import { ArrowRight, ShoppingBag, Store, MessageCircle, Star, ShieldCheck, Banknote, ClipboardList, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { CtaForm } from "@/components/sections/CtaForm";

type Step = {
  icon: typeof ShoppingBag;
  title: string;
  body: string;
};

const customerSteps: Step[] = [
  {
    icon: ShoppingBag,
    title: "Browse verified businesses",
    body: "Open the Customer portal, search by category or location, and pick a business. Every business on BizOrder Nexus is verified before they can sell.",
  },
  {
    icon: ClipboardList,
    title: "Place a secure order",
    body: "Choose a product or service, add a reference photo if you'd like, select delivery or pickup, then pay through the secure payment gateway. Your money is only released once you confirm the job is done.",
  },
  {
    icon: Bell,
    title: "Track every stage live",
    body: "Watch your order move through Accepted → In progress → Ready → Awaiting your confirmation → Completed. You get a notification at every stage.",
  },
  {
    icon: MessageCircle,
    title: "Message the business",
    body: "Talk to the business directly from the order page if you need to share details or ask a question.",
  },
  {
    icon: Star,
    title: "Confirm and review",
    body: "Once you've received what you ordered, confirm completion and leave a rating. Your review helps other customers shop with confidence.",
  },
];

const businessSteps: Step[] = [
  {
    icon: Store,
    title: "Set up your business profile",
    body: "Sign up as a business, upload your verification documents, and wait for admin approval. Once verified you're live on the marketplace.",
  },
  {
    icon: ClipboardList,
    title: "Build your catalog",
    body: "Open the Catalog page to add services and products. Upload 1–3 photos per item, set a fixed price or price range, and choose delivery options.",
  },
  {
    icon: Bell,
    title: "Set your availability",
    body: "Set your weekly hours in Settings → Availability. Customers can only book inside those windows, so no double bookings.",
  },
  {
    icon: ShieldCheck,
    title: "Accept and fulfil orders",
    body: "Paid orders land in your Orders queue. Accept or reject, then walk through the stage stepper: Start work → Mark ready → Send for customer confirmation. Upload proof photos at each stage.",
  },
  {
    icon: Banknote,
    title: "Get paid",
    body: "When the customer confirms completion, the payout moves to your Payouts page. Withdraw to your bank when you're ready.",
  },
];

const StepList = ({ steps }: { steps: Step[] }) => (
  <ol className="mt-10 space-y-4">
    {steps.map((step, index) => {
      const Icon = step.icon;
      return (
        <li
          key={step.title}
          className="flex gap-5 rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card md:p-7"
        >
          <div className="flex shrink-0 flex-col items-center gap-2">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Icon className="h-6 w-6" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Step {index + 1}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">{step.body}</p>
          </div>
        </li>
      );
    })}
  </ol>
);

const HowItWorksPage = () => {
  return (
    <SiteLayout>
      <section className="relative pt-32 pb-12 md:pt-40">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block rounded-full bg-foreground/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            How it works
          </span>
          <h1 className="mt-5 font-display text-5xl font-bold md:text-6xl">
            One platform.<br />
            <span className="text-foreground/60">Two simple portals.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Customers shop with proof. Businesses sell with trust. Here's exactly how each side works.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="xl" asChild>
              <Link to="/signup">
                Get started <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="relative py-12 md:py-16">
        <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-2">
          <div>
            <div className="mx-auto max-w-xl">
              <h2 className="font-display text-3xl font-bold md:text-4xl">Customer portal</h2>
              <p className="mt-3 text-muted-foreground">
                Order from verified local businesses, track every step, and only pay when you're happy.
              </p>
              <StepList steps={customerSteps} />
            </div>
          </div>

          <div>
            <div className="mx-auto max-w-xl">
              <h2 className="font-display text-3xl font-bold md:text-4xl">Business portal</h2>
              <p className="mt-3 text-muted-foreground">
                Take your business online, manage orders end to end, and get paid securely.
              </p>
              <StepList steps={businessSteps} />
            </div>
          </div>
        </div>
      </section>

      <CtaForm />
    </SiteLayout>
  );
};

export { HowItWorksPage };
export default HowItWorksPage;

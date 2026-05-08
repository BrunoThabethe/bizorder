import { ArrowRight, UserPlus, Store, ShoppingBag, Banknote, MessageCircle, Star, Bell, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { ClickAnimation, type ClickStep, type ClickAnimationItem } from "@/components/ClickAnimation";
import { CtaForm } from "@/components/sections/CtaForm";

type Flow = {
  icon: typeof UserPlus;
  badge: string;
  title: string;
  steps: { text: string; targetIndex: number }[];
  items: ClickAnimationItem[];
  animTitle: string;
};

const businessFlow: Flow[] = [
  {
    icon: UserPlus, badge: "Step 1", title: "Create your business account",
    items: [
      { label: "Home" }, { label: "How it works" }, { label: "Log in" },
      { label: "Get started", primary: true }, { label: "I'm a business", primary: true },
      { label: "Create account", primary: true }, { label: "Confirm email", primary: true },
    ],
    steps: [
      { text: "Open the BizOrder homepage and click 'Get started' in the top right.", targetIndex: 3 },
      { text: "Choose 'I'm a business' on the signup screen.", targetIndex: 4 },
      { text: "Fill in your business name, email and password, then click 'Create account'.", targetIndex: 5 },
      { text: "Open the verification email and click 'Confirm email'.", targetIndex: 6 },
    ],
    animTitle: "Where to click on the homepage",
  },
  {
    icon: Store, badge: "Step 2", title: "Add your products and services",
    items: [
      { label: "Products & services" }, { label: "Add new", primary: true },
      { label: "Upload photo", primary: true }, { label: "Set pickup price" },
      { label: "Enable delivery", primary: true }, { label: "Save and publish", primary: true },
    ],
    steps: [
      { text: "From the sidebar, open 'Products & services'.", targetIndex: 0 },
      { text: "Click 'Add new' to create a service or product.", targetIndex: 1 },
      { text: "Upload a clear photo and set your pickup price.", targetIndex: 2 },
      { text: "Toggle 'Enable delivery' and set your price per km if you offer delivery.", targetIndex: 4 },
      { text: "Click 'Save and publish' to make it live.", targetIndex: 5 },
    ],
    animTitle: "Listing an item with delivery",
  },
  {
    icon: Bell, badge: "Step 3", title: "Set your weekly availability",
    items: [
      { label: "Settings" }, { label: "Weekly availability" }, { label: "Open Mon-Fri" },
      { label: "Add time range", primary: true }, { label: "Save", primary: true },
    ],
    steps: [
      { text: "Open 'Settings' from the sidebar.", targetIndex: 0 },
      { text: "Scroll to 'Weekly availability'.", targetIndex: 1 },
      { text: "Toggle the days you're open and add time windows.", targetIndex: 3 },
      { text: "Click 'Save'. Customers can only book inside those windows — no double bookings.", targetIndex: 4 },
    ],
    animTitle: "Setting bookable hours",
  },
  {
    icon: ShoppingBag, badge: "Step 4", title: "Accept and progress orders",
    items: [
      { label: "Orders" }, { label: "View order" }, { label: "Reject with reason" },
      { label: "Accept order", primary: true }, { label: "Start work", primary: true },
      { label: "Mark ready", primary: true }, { label: "Send for confirmation", primary: true },
    ],
    steps: [
      { text: "Open 'Orders' to see new requests.", targetIndex: 0 },
      { text: "Open the order — you'll see the customer's reference photo and notes.", targetIndex: 1 },
      { text: "Click 'Accept order' (or reject with a reason — required while pending).", targetIndex: 3 },
      { text: "Walk through the stage stepper: Start work → Mark ready → Send for confirmation. Each stage locks once advanced.", targetIndex: 6 },
    ],
    animTitle: "Working an order to completion",
  },
  {
    icon: Banknote, badge: "Step 5", title: "Get paid",
    items: [{ label: "Payouts" }, { label: "Withdraw", primary: true }, { label: "Confirm bank" }, { label: "Send to my bank", primary: true }],
    steps: [
      { text: "Once the customer confirms, your payout moves to 'Available'.", targetIndex: 0 },
      { text: "Click 'Withdraw' next to your balance.", targetIndex: 1 },
      { text: "Confirm your bank account.", targetIndex: 2 },
      { text: "Click 'Send to my bank' to receive your money.", targetIndex: 3 },
    ],
    animTitle: "Withdrawing your earnings",
  },
];

const customerFlow: Flow[] = [
  {
    icon: ShoppingBag, badge: "Step 1", title: "Find a business and place an order",
    items: [
      { label: "Browse" }, { label: "Open profile" }, { label: "Order now", primary: true },
      { label: "Pickup or Delivery", primary: true }, { label: "Add reference photo" },
      { label: "Pick date & time" }, { label: "Place order", primary: true },
    ],
    steps: [
      { text: "Click 'Browse' and find a business by category or location.", targetIndex: 0 },
      { text: "Open their profile to see services, products and live availability.", targetIndex: 1 },
      { text: "Click 'Order now' on the item you want.", targetIndex: 2 },
      { text: "Choose Pickup or Delivery — for delivery, the distance is calculated automatically from your saved address.", targetIndex: 3 },
      { text: "Add an optional reference photo (allergies, sample, inspiration) so the provider knows exactly what you want.", targetIndex: 4 },
      { text: "Pick a date and time inside the provider's availability, then click 'Place order'.", targetIndex: 6 },
    ],
    animTitle: "Placing an order with a reference photo",
  },
  {
    icon: MessageCircle, badge: "Step 2", title: "Track every stage live",
    items: [
      { label: "My orders" }, { label: "Open order" }, { label: "Stage stepper" },
      { label: "Message provider", primary: true },
    ],
    steps: [
      { text: "Open 'My orders' to see all active orders.", targetIndex: 0 },
      { text: "Open the order to see the 5-stage stepper: Accepted → In progress → Ready → Awaiting your confirmation → Completed.", targetIndex: 1 },
      { text: "Get a notification each time the provider advances a stage.", targetIndex: 2 },
      { text: "Click 'Message provider' if you need to ask anything.", targetIndex: 3 },
    ],
    animTitle: "Following the order stages",
  },
  {
    icon: CheckCircle2, badge: "Step 3", title: "Confirm completion",
    items: [{ label: "Open order" }, { label: "View proof photos" }, { label: "Open dispute" }, { label: "Confirm completion", primary: true }],
    steps: [
      { text: "When the provider sends the order for your confirmation, open it.", targetIndex: 0 },
      { text: "Check the proof photos against your reference.", targetIndex: 1 },
      { text: "If something is off, open a dispute. Otherwise click 'Confirm completion'.", targetIndex: 3 },
    ],
    animTitle: "Confirming completion",
  },
  {
    icon: Star, badge: "Step 4", title: "Leave a review",
    items: [{ label: "★★★★★" }, { label: "Write a note" }, { label: "Submit review", primary: true }],
    steps: [
      { text: "Click the stars to set a 1-5 rating.", targetIndex: 0 },
      { text: "Write a short note about your experience.", targetIndex: 1 },
      { text: "Click 'Submit review' to publish.", targetIndex: 2 },
    ],
    animTitle: "Submitting your review",
  },
];

const FlowList = ({ flows }: { flows: Flow[] }) => (
  <div className="mt-12 space-y-8">
    {flows.map((step) => {
      const Icon = step.icon;
      return (
        <div key={step.title} className="grid items-start gap-6 rounded-2xl bg-background/30 p-6 backdrop-blur-sm md:grid-cols-[1fr_1fr] md:gap-10 md:p-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-foreground/10 text-foreground">
                <Icon className="h-6 w-6" />
              </span>
              <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                {step.badge}
              </span>
            </div>
            <h3 className="mt-5 font-display text-2xl font-bold">{step.title}</h3>
            <ol className="mt-5 space-y-3">
              {step.steps.map((line, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-foreground text-background text-xs font-bold">
                    {i + 1}
                  </span>
                  <span>{line.text}</span>
                </li>
              ))}
            </ol>
          </div>

          <ClickAnimation
            title={step.animTitle}
            items={step.items}
            steps={step.steps.map<ClickStep>((s) => ({ label: s.text, targetIndex: s.targetIndex }))}
          />
        </div>
      );
    })}
  </div>
);

const HowItWorksPage = () => {
  return (
    <SiteLayout>
      <section className="relative pt-32 pb-12 md:pt-40">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block rounded-full bg-foreground/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">How it works</span>
          <h1 className="mt-5 font-display text-5xl font-bold md:text-6xl">
            From signup to first sale.<br /><span className="text-foreground/60">In simple steps.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            BizOrder takes you through every step — with clear instructions and animated tutorials.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="xl" asChild><Link to="/signup">Get started <ArrowRight className="h-5 w-5" /></Link></Button>
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">For business owners</h2>
            <p className="mt-3 text-muted-foreground">Five steps to take your business online and start getting paid.</p>
          </div>
          <FlowList flows={businessFlow} />
        </div>
      </section>

      <section className="relative py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">For customers</h2>
            <p className="mt-3 text-muted-foreground">Order safely from real local businesses in four easy steps.</p>
          </div>
          <FlowList flows={customerFlow} />
        </div>
      </section>

      <CtaForm />
    </SiteLayout>
  );
};

export { HowItWorksPage };
export default HowItWorksPage;

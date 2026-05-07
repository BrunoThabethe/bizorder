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
    icon: Store, badge: "Step 2", title: "Add your products or services",
    items: [
      { label: "Orders" }, { label: "Products" }, { label: "Messages" },
      { label: "Add product", primary: true }, { label: "Upload photo", primary: true }, { label: "Save and publish", primary: true },
    ],
    steps: [
      { text: "From your dashboard, click 'Products' in the sidebar.", targetIndex: 1 },
      { text: "Click 'Add product' at the top right.", targetIndex: 3 },
      { text: "Click 'Upload photo' and pick a clear image.", targetIndex: 4 },
      { text: "Click 'Save and publish' to make it live.", targetIndex: 5 },
    ],
    animTitle: "Adding your first product",
  },
  {
    icon: Bell, badge: "Step 3", title: "Accept incoming orders",
    items: [
      { label: "Orders" }, { label: "View order" }, { label: "Reject" },
      { label: "Accept order", primary: true }, { label: "Set ETA", primary: true },
    ],
    steps: [
      { text: "Click 'Orders' to open the order list.", targetIndex: 0 },
      { text: "Click the new order to open its details.", targetIndex: 1 },
      { text: "Click 'Accept order' to confirm.", targetIndex: 3 },
      { text: "Click 'Set ETA' so the customer knows when it'll be ready.", targetIndex: 4 },
    ],
    animTitle: "Accepting a new order",
  },
  {
    icon: ShoppingBag, badge: "Step 4", title: "Update progress with proof",
    items: [{ label: "Update progress" }, { label: "In progress" }, { label: "Add photo" }, { label: "Send update", primary: true }],
    steps: [
      { text: "Open the order and click 'Update progress'.", targetIndex: 0 },
      { text: "Pick a status — click 'In progress'.", targetIndex: 1 },
      { text: "Click 'Add photo' to upload proof.", targetIndex: 2 },
      { text: "Click 'Send update' to notify the customer.", targetIndex: 3 },
    ],
    animTitle: "Sending a progress update",
  },
  {
    icon: Banknote, badge: "Step 5", title: "Get paid",
    items: [{ label: "Payouts" }, { label: "Withdraw", primary: true }, { label: "Confirm bank" }, { label: "Send to my bank", primary: true }],
    steps: [
      { text: "Open the 'Payouts' page from the sidebar.", targetIndex: 0 },
      { text: "Click 'Withdraw' next to your available balance.", targetIndex: 1 },
      { text: "Confirm the bank account.", targetIndex: 2 },
      { text: "Click 'Send to my bank' to receive your money.", targetIndex: 3 },
    ],
    animTitle: "Withdrawing your earnings",
  },
];

const customerFlow: Flow[] = [
  {
    icon: ShoppingBag, badge: "Step 1", title: "Find a business and place an order",
    items: [{ label: "Browse" }, { label: "Open profile" }, { label: "Order now", primary: true }, { label: "Add address" }, { label: "Pay now", primary: true }],
    steps: [
      { text: "Click 'Browse' to find a business by category or location.", targetIndex: 0 },
      { text: "Click 'Open profile' to view their services.", targetIndex: 1 },
      { text: "Click 'Order now' on the item you want.", targetIndex: 2 },
      { text: "Click 'Add address' and enter delivery details.", targetIndex: 3 },
      { text: "Click 'Pay now' — your money is held safely until done.", targetIndex: 4 },
    ],
    animTitle: "Placing your order",
  },
  {
    icon: MessageCircle, badge: "Step 2", title: "Track and chat",
    items: [{ label: "My orders" }, { label: "Open order" }, { label: "Track" }, { label: "Message", primary: true }],
    steps: [
      { text: "Click 'My orders' to see all your active orders.", targetIndex: 0 },
      { text: "Click 'Open order' to view the live timeline.", targetIndex: 1 },
      { text: "Click 'Track' to see the latest status and ETA.", targetIndex: 2 },
      { text: "Click 'Message' to chat with the business.", targetIndex: 3 },
    ],
    animTitle: "Chatting with the business",
  },
  {
    icon: CheckCircle2, badge: "Step 3", title: "Approve and pay safely",
    items: [{ label: "Open order" }, { label: "View proof" }, { label: "Report issue" }, { label: "Approve & release", primary: true }],
    steps: [
      { text: "Click 'Open order' once the work is delivered.", targetIndex: 0 },
      { text: "Click 'View proof' to check the photos and result.", targetIndex: 1 },
      { text: "Click 'Approve & release' to complete the order.", targetIndex: 3 },
    ],
    animTitle: "Approving completion",
  },
  {
    icon: Star, badge: "Step 4", title: "Leave a review",
    items: [{ label: "★★★★★" }, { label: "Write a note" }, { label: "Submit review", primary: true }],
    steps: [
      { text: "Click the stars to set a 1-5 rating.", targetIndex: 0 },
      { text: "Click 'Write a note' and add a short comment.", targetIndex: 1 },
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

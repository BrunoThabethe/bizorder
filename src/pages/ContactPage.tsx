import { useState, FormEvent } from "react";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import { z } from "zod";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  topic: z.string().trim().min(1, "Pick a topic").max(80),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(1000),
});

const channels = [
  { icon: Mail, title: "Email us", text: "We reply within one business day.", value: "info@bizorder.co.za", href: "mailto:info@bizorder.co.za" },
  { icon: MessageCircle, title: "WhatsApp", text: "Quickest for order issues.", value: "+27 60 000 0000", href: "https://wa.me/27600000000" },
  { icon: Phone, title: "Call", text: "Mon–Fri, 09:00–17:00.", value: "+27 11 000 0000", href: "tel:+27110000000" },
];

const ContactPage = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = contactSchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      topic: form.get("topic"),
      message: form.get("message"),
    });

    if (!parsed.success) {
      toast({ title: "Check the form", description: parsed.error.issues[0]?.message ?? "Please check the form", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast({ title: "Message sent", description: "We'll get back to you soon." });
      (event.target as HTMLFormElement).reset();
    }, 600);
  };

  return (
    <SiteLayout>
      <section className="relative pt-32 pb-10 md:pt-40">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block rounded-full bg-foreground/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</span>
          <h1 className="mt-5 font-display text-5xl font-bold md:text-6xl">We're here to help.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Question, bug, partnership idea? Pick a channel or send a message — a real human reads every one.
          </p>
        </div>
      </section>

      <section className="relative pb-20 md:pb-28">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-4">
              {channels.map((c) => (
                <a key={c.title} href={c.href} className="block rounded-2xl bg-background/30 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-background/50">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-foreground/10 text-foreground">
                      <c.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold">{c.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{c.value}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <form onSubmit={onSubmit} className="rounded-2xl bg-background/30 p-6 backdrop-blur-sm md:p-8">
              <h2 className="font-display text-2xl font-bold">Send a message</h2>
              <p className="mt-2 text-sm text-muted-foreground">Fill in your details and we'll get back to you fast.</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" name="name" placeholder="Sarah Mokoena" required maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="sarah@example.com" required maxLength={255} />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="topic">What's it about?</Label>
                <Input id="topic" name="topic" placeholder="e.g. Refund on order #1024" required maxLength={80} />
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" rows={6} placeholder="Tell us what's going on…" required maxLength={1000} />
              </div>

              <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
                {submitting ? "Sending…" : "Send message"} <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

export { ContactPage };
export default ContactPage;

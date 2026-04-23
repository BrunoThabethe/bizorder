import { SiteLayout } from "@/components/layout/SiteLayout";
import { PricingSlider } from "@/components/sections/PricingSlider";
import { CtaForm } from "@/components/sections/CtaForm";

const PricingPage = () => {
  return (
    <SiteLayout>
      <section className="relative pt-32 pb-4 md:pt-40">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-5xl font-bold md:text-6xl">Plans that grow with you</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Start free. Upgrade only when you're ready. Cancel anytime.
          </p>
        </div>
      </section>
      <PricingSlider />
      <CtaForm />
    </SiteLayout>
  );
};

export { PricingPage };
export default PricingPage;

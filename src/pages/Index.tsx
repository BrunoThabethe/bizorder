import { SiteLayout } from "@/components/layout/SiteLayout";
import { Hero } from "@/components/sections/Hero";
import { Pains } from "@/components/sections/Pains";
import { CtaForm } from "@/components/sections/CtaForm";

const Index = () => {
  return (
    <SiteLayout>
      <Hero />
      <Pains />
      <CtaForm />
    </SiteLayout>
  );
};

export { Index };
export default Index;

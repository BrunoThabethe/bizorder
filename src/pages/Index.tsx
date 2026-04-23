import { SiteLayout } from "@/components/layout/SiteLayout";
import { Hero } from "@/components/sections/Hero";
import { Pains } from "@/components/sections/Pains";
import { SocialProof } from "@/components/sections/SocialProof";
import { CtaForm } from "@/components/sections/CtaForm";

const Index = () => {
  return (
    <SiteLayout>
      <Hero />
      <Pains />
      <SocialProof />
      <CtaForm />
    </SiteLayout>
  );
};

export { Index };
export default Index;

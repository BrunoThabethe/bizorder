import { LegalLayout } from "@/components/layout/LegalLayout";

const PlatformRulesPage = () => (
  <LegalLayout title="Platform rules" intro="The standards every BizOrder customer, business, and crew member follows." lastUpdated="22/04/2026">
    <section>
      <h2 className="font-display text-2xl font-bold">Our values</h2>
      <p className="mt-3 text-muted-foreground">BizOrder is built on five values: <strong className="text-foreground">Transparency, Accountability, Impartiality, Responsiveness,</strong> and <strong className="text-foreground">Integrity</strong>.</p>
    </section>
    <section>
      <h2 className="font-display text-2xl font-bold">Be honest</h2>
      <p className="mt-3 text-muted-foreground">List real services at real prices. Don't fake reviews, photos, or proof uploads.</p>
    </section>
    <section>
      <h2 className="font-display text-2xl font-bold">Strikes and suspensions</h2>
      <p className="mt-3 text-muted-foreground">Breaking a rule earns a strike. Three strikes within 90 days suspends the account.</p>
    </section>
  </LegalLayout>
);

export { PlatformRulesPage };
export default PlatformRulesPage;

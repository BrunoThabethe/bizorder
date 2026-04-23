import { LegalLayout } from "@/components/layout/LegalLayout";

const TermsPage = () => (
  <LegalLayout title="Terms of service" intro="The simple rules for using BizOrder as a customer or a business." lastUpdated="22/04/2026">
    <section>
      <h2 className="font-display text-2xl font-bold">Using BizOrder</h2>
      <p className="mt-3 text-muted-foreground">You must be 18 or older, give accurate information, and keep your login safe.</p>
    </section>
    <section>
      <h2 className="font-display text-2xl font-bold">What you can't do</h2>
      <p className="mt-3 text-muted-foreground">Don't use BizOrder for anything illegal, abusive, or misleading.</p>
    </section>
  </LegalLayout>
);

export { TermsPage };
export default TermsPage;

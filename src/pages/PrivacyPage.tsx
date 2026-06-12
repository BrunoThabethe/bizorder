import { LegalLayout } from "@/components/layout/LegalLayout";

const PrivacyPage = () => (
  <LegalLayout title="Privacy policy" intro="We keep your data safe, only collect what we need, and never sell it." lastUpdated="22/04/2026">
    <section>
      <h2 className="font-display text-2xl font-bold">What we collect</h2>
      <p className="mt-3 text-muted-foreground">When you use BizOrder we collect your name, email, phone number, delivery address, order details, payment status, and the messages you send to businesses.</p>
    </section>
    <section>
      <h2 className="font-display text-2xl font-bold">How we use your information</h2>
      <p className="mt-3 text-muted-foreground">
        Any information you provide to BizOrder — whether as a customer or a business — is collected and used solely by BizOrder to operate the platform: verifying your identity and business, processing orders and payments, sending notifications you agreed to, and supporting you when something goes wrong.
      </p>
      <p className="mt-3 text-muted-foreground">
        We do not sell your data. We do not share it with third parties for marketing. The only time we will look beyond ordinary platform use is when we have reasonable grounds to believe that fraud, a scam, harassment, or other unlawful or dangerous activity is taking place. In those cases, we may review the relevant information internally, and where the law requires it, share it with the appropriate authorities for investigation.
      </p>
    </section>
    <section>
      <h2 className="font-display text-2xl font-bold">Your rights</h2>
      <p className="mt-3 text-muted-foreground">You can request a copy of your data, correct it, or ask us to delete your account at any time. Email <a className="font-semibold text-foreground underline" href="mailto:info@bizorder.co.za">info@bizorder.co.za</a>.</p>
    </section>
  </LegalLayout>
);

export { PrivacyPage };
export default PrivacyPage;

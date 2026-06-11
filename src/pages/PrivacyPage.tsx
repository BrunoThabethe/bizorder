import { LegalLayout } from "@/components/layout/LegalLayout";

const PrivacyPage = () => (
  <LegalLayout title="Privacy policy" intro="We keep your data safe, only collect what we need, and never sell it." lastUpdated="22/04/2026">
    <section>
      <h2 className="font-display text-2xl font-bold">What we collect</h2>
      <p className="mt-3 text-muted-foreground">When you use BizOrder we collect your name, email, phone number, delivery address, order details, payment status, and the messages you send to businesses.</p>
    </section>
    <section>
      <h2 className="font-display text-2xl font-bold">Your rights</h2>
      <p className="mt-3 text-muted-foreground">You can request a copy of your data, correct it, or ask us to delete your account at any time. Email <a className="font-semibold text-foreground underline" href="mailto:info@bizorder.co.za">info@bizorder.co.za</a>.</p>
    </section>
  </LegalLayout>
);

export { PrivacyPage };
export default PrivacyPage;

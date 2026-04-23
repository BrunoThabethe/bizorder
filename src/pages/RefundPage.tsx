import { LegalLayout } from "@/components/layout/LegalLayout";

const RefundPage = () => (
  <LegalLayout title="Refunds and cancellations" intro="Clear, fair rules so both sides know what to expect." lastUpdated="22/04/2026">
    <section>
      <h2 className="font-display text-2xl font-bold">Before the business accepts</h2>
      <p className="mt-3 text-muted-foreground">You can cancel any order before the business accepts it and get a full refund — no questions asked.</p>
    </section>
    <section>
      <h2 className="font-display text-2xl font-bold">If something goes wrong</h2>
      <p className="mt-3 text-muted-foreground">Open a dispute from the order page within 7 days of completion. Our team reviews fairly.</p>
    </section>
  </LegalLayout>
);

export { RefundPage };
export default RefundPage;

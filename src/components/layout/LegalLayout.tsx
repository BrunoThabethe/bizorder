import { ReactNode } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";

type LegalLayoutProps = {
  title: string;
  intro?: string;
  lastUpdated?: string;
  children: ReactNode;
};

export const LegalLayout = ({ title, intro, lastUpdated, children }: LegalLayoutProps) => {
  return (
    <SiteLayout>
      <section className="relative pt-32 pb-12 md:pt-40">
        <div className="container mx-auto max-w-3xl px-4">
          <span className="inline-block rounded-full bg-foreground/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Legal
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold md:text-5xl">{title}</h1>
          {intro ? <p className="mt-4 text-lg text-muted-foreground">{intro}</p> : null}
          {lastUpdated ? (
            <p className="mt-3 text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
          ) : null}
        </div>
      </section>

      <section className="relative pb-24">
        <div className="container mx-auto max-w-3xl px-4">
          <article className="space-y-8 rounded-2xl bg-background/30 p-8 leading-relaxed text-foreground/90 backdrop-blur-sm md:p-10">
            {children}
          </article>
        </div>
      </section>
    </SiteLayout>
  );
};

import { ReactNode } from "react";
import { InteractiveDotsBackground } from "@/components/InteractiveDotsBackground";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";

type SiteLayoutProps = {
  children: ReactNode;
};

export const SiteLayout = ({ children }: SiteLayoutProps) => {
  return (
    <div className="relative min-h-screen bg-background">
      <InteractiveDotsBackground />
      <div className="relative z-10">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
};

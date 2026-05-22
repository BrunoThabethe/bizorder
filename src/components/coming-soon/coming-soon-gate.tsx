import { useEffect, useState, type ReactNode } from "react";
import { ComingSoonPage } from "./coming-soon-page";
import { isUnlocked } from "./password-dialog";

interface ComingSoonGateProps {
  children: ReactNode;
}

export const ComingSoonGate = ({ children }: ComingSoonGateProps) => {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    setUnlocked(isUnlocked());
  }, []);

  if (unlocked === null) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!unlocked) {
    return <ComingSoonPage />;
  }

  return <>{children}</>;
};

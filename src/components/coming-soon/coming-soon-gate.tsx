import { useState, type ReactNode } from "react";
import { ComingSoonPage } from "./coming-soon-page";

interface ComingSoonGateProps {
  children: ReactNode;
}

/**
 * Always shows the Coming Soon page on a fresh page load.
 * Unlocking via the hidden password dialog is in-memory only — a reload
 * (or new tab) returns the visitor to the Coming Soon page.
 */
export const ComingSoonGate = ({ children }: ComingSoonGateProps) => {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <ComingSoonPage onUnlock={() => setUnlocked(true)} />;
  }

  return <>{children}</>;
};

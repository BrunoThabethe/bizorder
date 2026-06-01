import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const PASSWORD = "BizOrder2026";
const ATTEMPTS_KEY = "bo_unlock_attempts";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface AttemptsRecord {
  count: number;
  firstAt: number;
}

const readAttempts = (): AttemptsRecord => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return { count: 0, firstAt: Date.now() };
    const parsed = JSON.parse(raw) as AttemptsRecord;
    if (Date.now() - parsed.firstAt > WINDOW_MS) {
      return { count: 0, firstAt: Date.now() };
    }
    return parsed;
  } catch {
    return { count: 0, firstAt: Date.now() };
  }
};

const writeAttempts = (rec: AttemptsRecord) => {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(rec));
};

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlock?: () => void;
}

export const PasswordDialog = ({ open, onOpenChange, onUnlock }: PasswordDialogProps) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const attempts = readAttempts();
    if (attempts.count >= MAX_ATTEMPTS) {
      setError("Too many attempts. Try again later.");
      return;
    }

    if (value === PASSWORD) {
      localStorage.removeItem(ATTEMPTS_KEY);
      onUnlock?.();
      onOpenChange(false);
      setValue("");
      return;
    }

    const next: AttemptsRecord = {
      count: attempts.count + 1,
      firstAt: attempts.firstAt,
    };
    writeAttempts(next);
    setShake(true);
    setError("Wrong password. Try again.");
    setTimeout(() => setShake(false), 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/40 bg-background/80 backdrop-blur-xl sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center font-display text-xl">
            Team access
          </DialogTitle>
          <DialogDescription className="text-center">
            Enter the password to preview the full BizOrder app for this session.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            autoFocus
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder="Password"
            maxLength={64}
            className={shake ? "animate-[shake_0.4s_ease]" : ""}
            aria-invalid={!!error}
          />
          {error && (
            <p className="text-center text-xs font-medium text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full">
            Enter
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import { useEffect, useRef, useState } from "react";
import { MousePointer2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClickStep = {
  label: string;
  targetIndex: number;
};

export type ClickAnimationItem = {
  label: string;
  primary?: boolean;
};

type ClickAnimationProps = {
  title: string;
  caption?: string;
  badge?: string;
  items: ClickAnimationItem[];
  steps: ClickStep[];
};

const STEP_DURATION_MS = 2600;
const MOVE_MS = 1100;
const PRESS_DELAY = 1300;
const FLASH_HOLD = 1100;

export const ClickAnimation = ({ title, caption, badge, items, steps }: ClickAnimationProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [stepIndex, setStepIndex] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 14, y: 14 });
  const [pressed, setPressed] = useState(false);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    const runStep = (idx: number) => {
      const container = containerRef.current;
      const target = itemRefs.current[steps[idx]?.targetIndex];
      if (!container || !target) {
        timers.push(setTimeout(() => runStep(idx), 200));
        return;
      }

      const cRect = container.getBoundingClientRect();
      const tRect = target.getBoundingClientRect();
      const targetX = tRect.left - cRect.left + tRect.width / 2 - 6;
      const targetY = tRect.top - cRect.top + tRect.height / 2 - 4;

      setPressed(false);
      setPos({ x: targetX, y: targetY });

      timers.push(setTimeout(() => setPressed(true), PRESS_DELAY));

      timers.push(
        setTimeout(() => {
          setPressed(false);
          setCompleted((prev) => {
            const next = new Set(prev);
            next.add(idx);
            return next;
          });
        }, PRESS_DELAY + 220),
      );

      timers.push(
        setTimeout(() => {
          if (idx + 1 >= steps.length) {
            timers.push(
              setTimeout(() => {
                setCompleted(new Set());
                setStepIndex(0);
              }, FLASH_HOLD),
            );
          } else {
            setStepIndex(idx + 1);
          }
        }, STEP_DURATION_MS),
      );
    };

    runStep(stepIndex);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [stepIndex, steps]);

  const activeStep = steps[stepIndex];

  return (
    <div className="rounded-2xl bg-background/30 p-6 backdrop-blur-sm">
      {badge && (
        <span className="inline-block rounded-full bg-foreground/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-foreground">
          {badge}
        </span>
      )}
      <h3 className="mt-3 font-display text-xl font-bold">{title}</h3>

      <div ref={containerRef} className="relative mt-5 h-48 overflow-hidden rounded-xl bg-foreground/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground/25" />
            <span className="h-2 w-2 rounded-full bg-foreground/25" />
            <span className="h-2 w-2 rounded-full bg-foreground/25" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Step {stepIndex + 1} / {steps.length}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 text-xs leading-snug text-foreground">{activeStep?.label}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item, i) => {
            const isTarget = activeStep?.targetIndex === i;
            const wasClicked = completed.has(stepIndex) && isTarget;
            return (
              <button
                key={`${item.label}-${i}`}
                ref={(el) => (itemRefs.current[i] = el)}
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  item.primary ? "bg-foreground text-background" : "bg-foreground/10 text-foreground",
                  isTarget && pressed && "scale-95",
                  wasClicked && "bg-background text-foreground ring-2 ring-foreground",
                )}
              >
                {wasClicked && <Check className="h-3 w-3" strokeWidth={3} />}
                {item.label}
              </button>
            );
          })}
        </div>

        <div
          className="pointer-events-none absolute left-0 top-0"
          style={{
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
            transition: `transform ${MOVE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
        >
          <div className="relative">
            <MousePointer2
              className={cn(
                "h-5 w-5 fill-foreground text-background drop-shadow transition-transform",
                pressed && "scale-90",
              )}
            />
            {pressed && (
              <span className="absolute left-1 top-1 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-foreground/40" />
            )}
          </div>
        </div>
      </div>

      {caption && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{caption}</p>}
    </div>
  );
};

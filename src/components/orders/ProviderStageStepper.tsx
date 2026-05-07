import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/business/queries";

const STAGES: { key: OrderStatus; label: string; nextLabel: string }[] = [
  { key: "accepted", label: "Accepted", nextLabel: "Start work" },
  { key: "in_progress", label: "In progress", nextLabel: "Mark ready" },
  { key: "ready_for_review", label: "Ready for approval", nextLabel: "Send for approval" },
  { key: "completed", label: "Completed", nextLabel: "Done" },
];

const STAGE_INDEX: Partial<Record<OrderStatus, number>> = {
  accepted: 0,
  in_progress: 1,
  ready: 2,
  out_for_delivery: 2,
  ready_for_review: 2,
  completed: 3,
};

type Props = {
  status: OrderStatus;
  pending: boolean;
  onAdvance: (next: OrderStatus) => void;
};

export const ProviderStageStepper = ({ status, pending, onAdvance }: Props) => {
  const current = STAGE_INDEX[status] ?? 0;
  const nextStage = STAGES[current + 1];

  return (
    <div className="space-y-4">
      <ol className="flex items-center gap-2">
        {STAGES.map((s, i) => {
          const done = i < current || status === "completed";
          const active = i === current && status !== "completed";
          return (
            <li key={s.key} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                  done && "bg-foreground text-background",
                  active && "bg-foreground text-background ring-4 ring-foreground/15",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-semibold sm:inline",
                  active ? "text-foreground" : done ? "text-foreground/70" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
              {i < STAGES.length - 1 && (
                <div className={cn("h-0.5 flex-1 rounded-full", i < current ? "bg-foreground" : "bg-muted")} />
              )}
            </li>
          );
        })}
      </ol>

      {nextStage && status !== "completed" ? (
        <Button
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => onAdvance(nextStage.key)}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : nextStage.nextLabel}
        </Button>
      ) : (
        <Button size="lg" className="w-full" disabled>
          Awaiting customer approval
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Each stage locks once you advance. The customer approves the final completion.
      </p>
    </div>
  );
};

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/customer/queries";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Placed" },
  { key: "accepted", label: "Accepted" },
  { key: "in_progress", label: "In progress" },
  { key: "ready_for_review", label: "Ready" },
  { key: "completed", label: "Done" },
];

const ORDER: Record<OrderStatus, number> = {
  pending: 0,
  accepted: 1,
  in_progress: 2,
  ready: 3,
  out_for_delivery: 3,
  ready_for_review: 3,
  completed: 4,
  cancelled: -1,
};

type Props = { status: OrderStatus };

export const OrderStatusStepper = ({ status }: Props) => {
  if (status === "cancelled") {
    return (
      <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
        This order was cancelled.
      </div>
    );
  }
  const current = ORDER[status];
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
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
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  i < current ? "bg-foreground" : "bg-muted",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};

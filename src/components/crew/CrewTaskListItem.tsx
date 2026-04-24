import { Link } from "react-router-dom";
import { ChevronRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OrderTask } from "@/lib/business/queries";

type Props = {
  task: OrderTask & { orders?: { status: string } | null };
};

const STATUS_TONE: Record<OrderTask["status"], string> = {
  pending: "bg-muted text-foreground",
  in_progress: "bg-foreground/15 text-foreground",
  done: "bg-foreground text-background",
};

const STATUS_LABEL: Record<OrderTask["status"], string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

export const CrewTaskListItem = ({ task }: Props) => (
  <Link to={`/crew/tasks/${task.id}`} className="block">
    <Card className="rounded-2xl border-0 shadow-card transition-transform hover:-translate-y-0.5">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-bold">{task.title}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_TONE[task.status])}>
              {STATUS_LABEL[task.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Order #{task.order_id.slice(0, 8)}</p>
          {task.due_at ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> Due {new Date(task.due_at).toLocaleString("en-GB")}
            </p>
          ) : null}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  </Link>
);

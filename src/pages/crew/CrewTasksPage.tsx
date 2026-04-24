import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CrewLayout } from "@/components/crew/CrewLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { CrewTaskListItem } from "@/components/crew/CrewTaskListItem";
import { useAuth } from "@/hooks/use-auth";
import { fetchCrewTasks, fetchMyCrewRow, type OrderTask } from "@/lib/business/queries";
import { cn } from "@/lib/utils";

type Filter = "active" | "done" | "all";

const CrewTasksPage = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("active");

  const { data: crewRow } = useQuery({
    queryKey: ["my-crew-row", user?.id],
    queryFn: () => fetchMyCrewRow(user!.id),
    enabled: !!user?.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["crew-tasks", crewRow?.id],
    queryFn: () => fetchCrewTasks(crewRow!.id),
    enabled: !!crewRow?.id,
  });

  const filtered = useMemo(() => {
    const list = tasks as Array<OrderTask>;
    if (filter === "active") return list.filter((t) => t.status !== "done");
    if (filter === "done") return list.filter((t) => t.status === "done");
    return list;
  }, [tasks, filter]);

  return (
    <CrewLayout>
      <PageHeader title="My tasks" description="Only your assigned jobs are listed. Tap a task to update progress." />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["active", "done", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
              filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => (
            <CrewTaskListItem key={t.id} task={t} />
          ))}
        </div>
      )}
    </CrewLayout>
  );
};

export { CrewTasksPage };
export default CrewTasksPage;

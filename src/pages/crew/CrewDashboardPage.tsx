import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, ListChecks } from "lucide-react";
import { CrewLayout } from "@/components/crew/CrewLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CrewTaskListItem } from "@/components/crew/CrewTaskListItem";
import { useAuth } from "@/hooks/use-auth";
import { fetchCrewTasks, fetchMyCrewRow, type OrderTask } from "@/lib/business/queries";

const CrewDashboardPage = () => {
  const { user } = useAuth();

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

  const stats = useMemo(() => {
    const list = tasks as Array<OrderTask>;
    return {
      pending: list.filter((t) => t.status === "pending").length,
      inProgress: list.filter((t) => t.status === "in_progress").length,
      done: list.filter((t) => t.status === "done").length,
    };
  }, [tasks]);

  const nextUp = (tasks as Array<OrderTask>).filter((t) => t.status !== "done").slice(0, 5);

  return (
    <CrewLayout>
      <PageHeader
        eyebrow={crewRow?.role_title ?? "Crew"}
        title={`Hi ${crewRow?.display_name ?? user?.user_metadata?.full_name ?? ""}`}
        description="Only the jobs assigned to you appear here. Tap any task to update progress and upload proof."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={stats.pending} />
        <StatCard icon={<ListChecks className="h-4 w-4" />} label="In progress" value={stats.inProgress} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Done" value={stats.done} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Next up</h2>
        <Button asChild variant="secondary" size="sm">
          <Link to="/crew/tasks">View all</Link>
        </Button>
      </div>

      {nextUp.length === 0 ? (
        <Card className="mt-3 rounded-3xl border-0 shadow-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            You're all caught up. New jobs from your provider will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-3 grid gap-3">
          {nextUp.map((t) => (
            <CrewTaskListItem key={t.id} task={t} />
          ))}
        </div>
      )}
    </CrewLayout>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Card className="rounded-3xl border-0 shadow-card">
    <CardContent className="flex items-center justify-between p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl font-bold">{value}</p>
      </div>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">{icon}</span>
    </CardContent>
  </Card>
);

export { CrewDashboardPage };
export default CrewDashboardPage;

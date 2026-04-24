import { useQuery } from "@tanstack/react-query";
import { CrewLayout } from "@/components/crew/CrewLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyCrewRow } from "@/lib/business/queries";

const CrewProfilePage = () => {
  const { user } = useAuth();

  const { data: crewRow } = useQuery({
    queryKey: ["my-crew-row", user?.id],
    queryFn: () => fetchMyCrewRow(user!.id),
    enabled: !!user?.id,
  });

  return (
    <CrewLayout>
      <PageHeader title="My profile" description="Your account details. Contact your provider to change your role or display name." />

      <div className="grid gap-3">
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-2 p-5">
            <Row label="Display name" value={crewRow?.display_name ?? (user?.user_metadata?.full_name as string) ?? "—"} />
            <Row label="Role" value={crewRow?.role_title ?? "Crew"} />
            <Row label="Email" value={user?.email ?? "—"} />
            <Row label="Status" value={crewRow?.is_active ? "Active" : "Inactive"} />
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Crew accounts can only see jobs assigned to them. You don't have access to business finances, analytics, settings, or other crew members' work.
          </CardContent>
        </Card>
      </div>
    </CrewLayout>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold">{value}</span>
  </div>
);

export { CrewProfilePage };
export default CrewProfilePage;

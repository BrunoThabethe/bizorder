import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { CrewLayout } from "@/components/crew/CrewLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { fetchMyNotifications } from "@/lib/customer/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CrewNotificationsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["crew-notifications", user?.id],
    queryFn: () => fetchMyNotifications(user!.id),
    enabled: !!user?.id,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crew-notifications", user?.id] }),
    onError: (e: Error) => toast({ title: "Could not update", description: e.message, variant: "destructive" }),
  });

  return (
    <CrewLayout>
      <PageHeader title="Alerts" description="New tasks, status changes, and reminders for the work assigned to you." />

      {notifications.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="grid place-items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <Bell className="h-6 w-6" />
            <p>You're up to date.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn(
                "rounded-2xl border-0 shadow-card",
                !n.read_at && "ring-2 ring-foreground/20",
              )}
            >
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-display text-sm font-bold">{n.title}</p>
                  {n.body ? <p className="mt-1 text-xs text-muted-foreground">{n.body}</p> : null}
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("en-GB")}
                  </p>
                </div>
                {!n.read_at ? (
                  <Button size="sm" variant="secondary" onClick={() => markRead.mutate(n.id)}>
                    <Check className="h-3 w-3" /> Mark read
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CrewLayout>
  );
};

export { CrewNotificationsPage };
export default CrewNotificationsPage;

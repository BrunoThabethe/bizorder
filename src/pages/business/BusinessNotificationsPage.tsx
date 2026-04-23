import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const fetchNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
};

const BusinessNotificationsPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const { data: items = [] } = useQuery({
    queryKey: ["b-notifications", userId],
    queryFn: () => fetchNotifications(userId),
    enabled: !!userId,
  });

  const markRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["b-notifications", userId] }),
  });

  useEffect(() => {
    if (items.some((n) => !n.read_at)) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Order alerts, customer messages, and platform updates."
        action={
          <Button variant="secondary" onClick={() => markRead.mutate()}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />
      {items.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">You're all caught up.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((n) => (
            <Card key={n.id} className="rounded-3xl border-0 shadow-card">
              <CardContent className="flex items-start gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground text-background">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{n.title}</p>
                  {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("en-ZA")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </BusinessLayout>
  );
};

export { BusinessNotificationsPage };
export default BusinessNotificationsPage;

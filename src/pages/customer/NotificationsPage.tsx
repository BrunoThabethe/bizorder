import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyNotifications } from "@/lib/customer/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NotificationsPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["customer-notifications", user?.id],
    queryFn: () => fetchMyNotifications(user?.id as string),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id || notifications.length === 0) return;
    const unread = notifications.filter((n) => !n.read_at);
    if (unread.length === 0) return;
    void supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread.map((n) => n.id))
      .then(() => qc.invalidateQueries({ queryKey: ["customer-notifications", user.id] }));
  }, [notifications, user?.id, qc]);

  return (
    <CustomerLayout>
      <PageHeader eyebrow="Center" title="Notifications" description="Order updates, messages, and platform announcements." />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-card shadow-card" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="grid place-items-center rounded-3xl bg-card p-10 text-center shadow-card">
          <Bell className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-bold">All caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">You'll see new alerts here as they come in.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const Wrapper = n.link ? Link : "div";
            const wrapperProps = n.link ? { to: n.link } : ({} as never);
            return (
              <li key={n.id}>
                {/* @ts-expect-error dynamic component */}
                <Wrapper
                  {...wrapperProps}
                  className={cn(
                    "block rounded-2xl bg-card p-4 shadow-card transition-colors",
                    !n.read_at && "ring-1 ring-foreground/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold">{n.title}</p>
                      {n.body ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                </Wrapper>
              </li>
            );
          })}
        </ul>
      )}
    </CustomerLayout>
  );
};

export { NotificationsPage };
export default NotificationsPage;

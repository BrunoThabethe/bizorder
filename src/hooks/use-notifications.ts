import { useQuery } from "@tanstack/react-query";
import { fetchMyNotifications } from "@/lib/customer/queries";
import { cacheTiers, queryKeys, useRealtimeInvalidate } from "@/lib/cache";

/**
 * Shared notifications hook used by the bell, dashboard, and notification pages.
 *
 * Cache + realtime: list is cached under `queryKeys.notifications(userId)` and
 * a Postgres realtime subscription on `notifications` for this user invalidates
 * the cache the moment a new row lands. Every consumer of the hook then refreshes
 * in-place — no polling, no duplicate network calls.
 */
export const useNotifications = (userId: string | null | undefined) => {
  const query = useQuery({
    queryKey: queryKeys.notifications(userId ?? ""),
    enabled: !!userId,
    ...cacheTiers.standard,
    queryFn: () => fetchMyNotifications(userId as string),
  });

  useRealtimeInvalidate(
    { table: "notifications", filter: userId ? `user_id=eq.${userId}` : undefined },
    [queryKeys.notifications(userId ?? "")],
    { enabled: !!userId },
  );

  return query;
};

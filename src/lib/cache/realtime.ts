import { useEffect } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type RealtimeFilter = {
  /** Postgres table name in the `public` schema. */
  table: string;
  /** Optional Postgres filter, e.g. `order_id=eq.<uuid>` or `user_id=eq.<uuid>`. */
  filter?: string;
  /** Optional event subset; defaults to all changes. */
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
};

/**
 * Subscribe to Postgres changes on a table and invalidate the given React Query
 * keys whenever a matching row changes. The cache then refetches on demand,
 * so screens stay live without polling.
 *
 *   useRealtimeInvalidate(
 *     { table: "messages", filter: `order_id=eq.${orderId}` },
 *     [queryKeys.orderMessages(orderId)],
 *   );
 *
 * Pass `enabled: false` to short-circuit (e.g. while ids are still loading).
 */
export const useRealtimeInvalidate = (
  source: RealtimeFilter | RealtimeFilter[],
  keysToInvalidate: QueryKey[],
  options: { enabled?: boolean } = {},
) => {
  const qc = useQueryClient();
  const enabled = options.enabled ?? true;
  const sources = Array.isArray(source) ? source : [source];
  const channelName = sources.map((s) => `${s.table}:${s.filter ?? "*"}`).join("|");

  useEffect(() => {
    if (!enabled) return;
    if (sources.length === 0) return;

    const channel = supabase.channel(`rt:${channelName}`);

    for (const s of sources) {
      // The Supabase JS client types for postgres_changes are loose; the
      // runtime contract matches the docs and is exercised below.
      channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: s.event ?? "*",
          schema: "public",
          table: s.table,
          ...(s.filter ? { filter: s.filter } : {}),
        },
        () => {
          for (const key of keysToInvalidate) {
            void qc.invalidateQueries({ queryKey: key });
          }
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channelName]);
};

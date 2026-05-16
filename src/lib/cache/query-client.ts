import { QueryClient } from "@tanstack/react-query";

/**
 * Tiered cache defaults.
 *
 * staleTime — how long data is trusted as fresh (no network call while fresh).
 * gcTime    — how long unused data stays in memory after the last component unmounts.
 *
 * Most existing queries do not pick a tier yet, so we set conservative defaults
 * that already deliver instant tab-switches and dedup across components,
 * without surprising anyone with stale data. Per-query overrides live in
 * `query-options.ts`.
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Trust answers for 30s before considering them stale.
        staleTime: 30 * 1000,
        // Keep unused data in memory for 5 min so back-navigation is instant.
        gcTime: 5 * 60 * 1000,
        // Background refresh on focus, but not every reconnect spam.
        refetchOnWindowFocus: true,
        refetchOnReconnect: "always",
        refetchOnMount: true,
        // Network errors retry once; auth/permission errors should not loop.
        retry: (failureCount, error) => {
          const message = (error as { message?: string })?.message ?? "";
          if (/permission|denied|not authenticated|jwt/i.test(message)) return false;
          return failureCount < 1;
        },
      },
      mutations: {
        retry: 0,
      },
    },
  });

/**
 * Per-tier cache presets. Mix into a useQuery call as needed:
 *
 *   useQuery({ queryKey, queryFn, ...cacheTiers.stable })
 *
 * Pick the slowest tier the data tolerates — colder caches mean fewer
 * round-trips. When in doubt, use `standard`.
 */
export const cacheTiers = {
  /** Almost-static: profile, roles, business identity. */
  stable: {
    staleTime: 5 * 60 * 1000, // 5 min fresh
    gcTime: 30 * 60 * 1000, // 30 min retained
  },
  /** Edited occasionally: services, hours, addresses. */
  steady: {
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  /** Default: lists that change but not by the second. */
  standard: {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  /** Live screens: order detail, messages, in-flight progress. */
  live: {
    staleTime: 10 * 1000,
    gcTime: 2 * 60 * 1000,
  },
  /** Heavy admin queries — tolerate ~1 min lag, retain longer. */
  heavy: {
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  /** Signed storage URLs — Supabase signs for 1h, cache just under. */
  signedUrl: {
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
  },
} as const;

export type CacheTier = keyof typeof cacheTiers;

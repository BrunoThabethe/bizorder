/**
 * Single source of truth for React Query keys.
 *
 * Why a registry: keys are how invalidation finds entries to refresh.
 * If two screens type `["orders"]` differently, mutations on one won't
 * refresh the other. Always import from here.
 */
export const queryKeys = {
  // ---- Auth / identity ----
  authRole: (userId: string | null | undefined) => ["auth", "role", userId ?? "anon"] as const,
  myProfile: (userId: string | null | undefined) => ["profile", "me", userId ?? "anon"] as const,

  // ---- Business owner ----
  myBusiness: (userId: string | null | undefined) => ["business", "mine", userId ?? "anon"] as const,
  businessSettings: (businessId: string) => ["business", "settings", businessId] as const,
  businessHours: (businessId: string) => ["business", "hours", businessId] as const,
  businessServices: (businessId: string) => ["business", "services", businessId] as const,
  businessReviews: (businessId: string) => ["business", "reviews", businessId] as const,
  businessPayouts: (businessId: string) => ["business", "payouts", businessId] as const,
  businessCrew: (businessId: string) => ["business", "crew", businessId] as const,
  businessOrders: (businessId: string) => ["business", "orders", businessId] as const,
  businessOrder: (orderId: string) => ["business", "order", orderId] as const,
  businessChangeRequests: (businessId: string) => ["business", "change-requests", businessId] as const,

  // ---- Customer ----
  publishedBusinesses: () => ["customer", "businesses", "published"] as const,
  publicBusiness: (slug: string) => ["customer", "business", "slug", slug] as const,
  publicServices: (businessId: string) => ["customer", "business", "services", businessId] as const,
  myOrders: (userId: string) => ["customer", "orders", userId] as const,
  myOrder: (orderId: string) => ["customer", "order", orderId] as const,
  orderEvents: (orderId: string) => ["order", "events", orderId] as const,
  orderMessages: (orderId: string) => ["order", "messages", orderId] as const,
  orderDisputes: (orderId: string) => ["order", "disputes", orderId] as const,
  orderProgress: (orderId: string) => ["order", "progress", orderId] as const,
  orderTasks: (orderId: string) => ["order", "tasks", orderId] as const,
  myAddresses: (userId: string) => ["customer", "addresses", userId] as const,
  myReviews: (userId: string) => ["customer", "reviews", userId] as const,

  // ---- Notifications (shared) ----
  notifications: (userId: string) => ["notifications", userId] as const,

  // ---- Crew ----
  myCrewRow: (userId: string) => ["crew", "me", userId] as const,
  crewTasks: (crewMemberId: string) => ["crew", "tasks", crewMemberId] as const,
  crewTask: (taskId: string) => ["crew", "task", taskId] as const,
  taskProgress: (taskId: string) => ["crew", "task-progress", taskId] as const,

  // ---- Admin ----
  adminMetrics: () => ["admin", "metrics"] as const,
  adminOrders: () => ["admin", "orders"] as const,
  adminProfiles: () => ["admin", "profiles"] as const,
  adminBusinesses: () => ["admin", "businesses"] as const,
  adminVerificationRequests: () => ["admin", "verification-requests"] as const,
  adminOnboardingSubmissions: () => ["admin", "onboarding-submissions"] as const,
  adminDisputes: () => ["admin", "disputes"] as const,
  adminPayouts: () => ["admin", "payouts"] as const,
  adminProgressLogs: () => ["admin", "progress-logs"] as const,
  adminSubscribers: () => ["admin", "newsletter"] as const,
  adminCampaigns: () => ["admin", "campaigns"] as const,
  adminAiSettings: () => ["admin", "ai-settings"] as const,
  adminSystemSettings: () => ["admin", "system-settings"] as const,
  adminAuditLogs: () => ["admin", "audit"] as const,
  adminChangeRequests: () => ["admin", "change-requests"] as const,

  // ---- Storage / media (signed URLs) ----
  signedMedia: (bucket: string, path: string) => ["storage", "signed", bucket, path] as const,
} as const;

/**
 * Helper key prefixes for bulk invalidation (e.g. invalidate every
 * "business" related cache after a mutation).
 */
export const queryKeyPrefixes = {
  business: ["business"] as const,
  customer: ["customer"] as const,
  order: ["order"] as const,
  admin: ["admin"] as const,
  notifications: ["notifications"] as const,
} as const;

/**
 * Lifecycle of a platform account the agent acts as.
 * - `active`: usable by Tasks.
 * - `needs_owner`: a gate only the owner can clear (verification code, identity check); Tasks skip it until resolved.
 * - `restricted`: the platform limited or suspended it; the reasoning layer plans around it.
 * - `retired`: no longer used.
 */
export const PLATFORM_ACCOUNT_STATUSES = ['active', 'needs_owner', 'restricted', 'retired'] as const;

export type PlatformAccountStatus = (typeof PLATFORM_ACCOUNT_STATUSES)[number];

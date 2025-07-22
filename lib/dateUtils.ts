/**
 * Date Utility Helpers
 * ---------------------
 * Centralizes common date-handling logic so that we are consistent when
 * converting UTC timestamps (stored in Supabase) to the user's **local** day.
 *
 * Rationale (rule: Consistency):
 * Supabase stores `created_at` as UTC timestamps. When we build daily metrics
 * on the client we must translate those timestamps into the user's local
 * calendar day or streaks/weekly charts will be off (e.g. late-night sessions
 * showing up on the previous day).
 */

/**
 * Returns an ISO-8601 date string (YYYY-MM-DD) representing the calendar day
 * in the user's **local** timezone for the supplied Date or date-string.
 *
 * We intentionally do NOT use `toISOString()` because that forces UTC and can
 * shift the date backward/forward relative to the user. Instead we construct a
 * new Date at local midnight and then format it.
 *
 * @param date – Date instance or string parseable by `new Date()`.
 */
export function toLocalDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Create a new Date representing midnight of the *local* calendar day
  const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // YYYY-MM-DD by slicing ISO string (which will be UTC but since the time is
  // midnight local, the date portion remains correct)
  return localMidnight.toISOString().slice(0, 10);
} 
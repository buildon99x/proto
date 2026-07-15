/**
 * Formats an ISO-8601 timestamp as a `YYYY-MM-DD` date for display.
 *
 * The date portion is sliced directly from the string rather than going
 * through `Date`, so the server and client render identical output regardless
 * of the runtime timezone (avoiding Next.js hydration mismatches).
 */
export function formatDate(iso?: string): string | null {
  if (!iso) {
    return null;
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return match ? match[1] : null;
}

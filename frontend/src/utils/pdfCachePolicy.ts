/**
 * Pure policy for the browser-side PDF cache (IndexedDB). Kept free of browser
 * APIs so it can be unit-tested in Node.
 *
 * Rules:
 *  - A cached PDF is scoped to (userId, bookId). It is never used for another
 *    book, another user, or when no user is logged in.
 *  - There is no "latest file" fallback: a cache miss means fetch from the
 *    server, never "show some other recently opened PDF".
 *  - Before a cache hit is rendered, the server is asked whether this user may
 *    still access the book. An explicit denial (401/403/404) purges the entry;
 *    only a network failure (offline) allows the cached copy.
 */

export interface PdfCacheRecord {
  cacheKey: string;
  userId: string;
  bookId: string;
  data: unknown;
  timestamp: number;
}

export const pdfCacheKey = (userId: string, bookId: string): string => `${userId}::${bookId}`;

export function isCacheRecordUsable(
  record: Partial<PdfCacheRecord> | null | undefined,
  userId: string | null | undefined,
  bookId: string | null | undefined
): boolean {
  if (!record || !userId || !bookId) return false;
  return (
    record.userId === userId &&
    record.bookId === bookId &&
    record.cacheKey === pdfCacheKey(userId, bookId) &&
    record.data != null
  );
}

export type AccessProbeResult = 'allowed' | 'denied' | 'unreachable';

/** Map an HTTP status (or a thrown network error => null) to a probe result. */
export function classifyAccessProbe(status: number | null): AccessProbeResult {
  if (status === null) return 'unreachable';
  if (status >= 200 && status < 300) return 'allowed';
  if (status === 401 || status === 403 || status === 404) return 'denied';
  // 5xx / rate limit: server could not answer authoritatively; treat like offline.
  return 'unreachable';
}

export type CachedPdfDecision = 'use' | 'purge';

export const decideCachedPdfUse = (probe: AccessProbeResult): CachedPdfDecision =>
  probe === 'denied' ? 'purge' : 'use';

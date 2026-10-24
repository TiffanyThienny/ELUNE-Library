/**
 * In-memory idempotency registry for book uploads.
 *
 * The client sends a random `clientUploadId` with each upload attempt and reuses
 * it when retrying the SAME file. If the first request is still being processed
 * (or already finished) when a retry arrives, the retry does not create a second
 * book. The client can also poll the status after a client-side timeout.
 *
 * Scope / limitation: state lives in this process only. It protects a single
 * backend instance (the current deployment model) and is lost on restart; a
 * multi-instance deployment would need a persistent key (schema change).
 */

export type UploadAttemptStatus = 'processing' | 'completed' | 'failed';

interface Entry {
  status: UploadAttemptStatus;
  bookId?: string;
  updatedAt: number;
}

export const UPLOAD_ATTEMPT_TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 5000;
const CLIENT_UPLOAD_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

const entries = new Map<string, Entry>();
const keyOf = (userId: string, clientUploadId: string) => `${userId}:${clientUploadId}`;

const prune = (now: number) => {
  for (const [k, e] of entries) {
    if (now - e.updatedAt > UPLOAD_ATTEMPT_TTL_MS) entries.delete(k);
  }
  // Hard cap: drop oldest entries (Map preserves insertion order).
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value as string | undefined;
    if (!oldest) break;
    entries.delete(oldest);
  }
};

export const isValidClientUploadId = (value: unknown): value is string =>
  typeof value === 'string' && CLIENT_UPLOAD_ID_PATTERN.test(value);

export type BeginResult =
  | { state: 'started' }
  | { state: 'processing' }
  | { state: 'completed'; bookId: string };

export const uploadIdempotency = {
  begin(userId: string, clientUploadId: string, now = Date.now()): BeginResult {
    prune(now);
    const key = keyOf(userId, clientUploadId);
    const existing = entries.get(key);
    if (existing?.status === 'processing') return { state: 'processing' };
    if (existing?.status === 'completed' && existing.bookId) return { state: 'completed', bookId: existing.bookId };
    // New attempt, or a retry after a failure: (re)start processing.
    entries.delete(key);
    entries.set(key, { status: 'processing', updatedAt: now });
    return { state: 'started' };
  },

  complete(userId: string, clientUploadId: string, bookId: string, now = Date.now()): void {
    entries.set(keyOf(userId, clientUploadId), { status: 'completed', bookId, updatedAt: now });
  },

  fail(userId: string, clientUploadId: string, now = Date.now()): void {
    const key = keyOf(userId, clientUploadId);
    if (entries.get(key)?.status === 'processing') {
      entries.set(key, { status: 'failed', updatedAt: now });
    }
  },

  /** Forget a completed attempt whose book no longer exists. */
  reset(userId: string, clientUploadId: string): void {
    entries.delete(keyOf(userId, clientUploadId));
  },

  get(userId: string, clientUploadId: string, now = Date.now()): Entry | null {
    const e = entries.get(keyOf(userId, clientUploadId));
    if (!e || now - e.updatedAt > UPLOAD_ATTEMPT_TTL_MS) return null;
    return e;
  }
};

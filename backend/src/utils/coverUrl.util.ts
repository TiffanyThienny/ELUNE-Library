import crypto from 'crypto';
import { Visibility, BookStatus } from '@prisma/client';
import { ENV } from '../config/env';

/**
 * Cover image access policy (mirrors canUserAccessBook):
 *  - Covers of PUBLIC + APPROVED books are public assets.
 *  - Covers of PRIVATE / PENDING / REJECTED / DRAFT books are served only with a
 *    short-lived HMAC signature. The signed URL is issued exclusively inside API
 *    responses that already passed the book access check, so only the owner and
 *    admins ever receive it. <img> tags cannot send a bearer token, hence a
 *    signed URL rather than an Authorization header.
 */

export const COVER_URL_TTL_SECONDS = 6 * 60 * 60; // 6 hours

const coverSigningKey = (): Buffer =>
  crypto.createHash('sha256').update(`elune-cover-url:v1:${ENV.JWT_SECRET}`).digest();

const signature = (filename: string, exp: number): string =>
  crypto.createHmac('sha256', coverSigningKey()).update(`${filename}:${exp}`).digest('base64url');

export interface CoverPolicyBook {
  coverUrl?: string | null;
  visibility: Visibility | string;
  status: BookStatus | string;
}

export const isPublicBook = (book: { visibility: string; status: string }): boolean =>
  book.visibility === Visibility.PUBLIC && book.status === BookStatus.APPROVED;

/** Only covers stored by this server ("/uploads/<name>") are subject to the policy. */
const localCoverFilename = (coverUrl?: string | null): string | null => {
  if (!coverUrl || !coverUrl.startsWith('/uploads/')) return null;
  const name = coverUrl.slice('/uploads/'.length);
  return name && !name.includes('/') && !name.includes('?') ? name : null;
};

export function signCoverFilename(filename: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const exp = nowSeconds + COVER_URL_TTL_SECONDS;
  return `/uploads/${filename}?exp=${exp}&sig=${signature(filename, exp)}`;
}

export function verifyCoverSignature(
  filename: string,
  exp: unknown,
  sig: unknown,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (typeof exp !== 'string' || typeof sig !== 'string' || !/^\d+$/.test(exp)) return false;
  const expNum = parseInt(exp, 10);
  if (expNum < nowSeconds) return false;
  const expected = Buffer.from(signature(filename, expNum));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** Cover URL to put in an API response that has already passed the access check. */
export function presentCoverUrl(book: CoverPolicyBook): string | null {
  const coverUrl = book.coverUrl ?? null;
  const filename = localCoverFilename(coverUrl);
  if (!filename || isPublicBook(book as any)) return coverUrl;
  return signCoverFilename(filename);
}

/** Return a shallow copy of a book-like object with its cover URL presented per policy. */
export function withPresentedCover<T extends CoverPolicyBook>(book: T): T {
  if (!book) return book;
  return { ...book, coverUrl: presentCoverUrl(book) };
}

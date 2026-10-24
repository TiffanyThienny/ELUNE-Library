/**
 * Robust IndexedDB client storage for Elunè offline & large book volumes.
 * Bypasses the 5MB browser localStorage quota limit completely.
 */

import { pdfCacheKey, isCacheRecordUsable, PdfCacheRecord } from './pdfCachePolicy';

const DB_NAME = 'elune_library_db';
// v2: PDF cache is keyed per (user, book). v1 entries were keyed by bookId only
// and carried no owner, so they are dropped on upgrade.
const DB_VERSION = 2;
const STORE_BOOKS = 'books';
const STORE_FILES = 'pdf_files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
      }
      if (db.objectStoreNames.contains(STORE_FILES)) {
        const existing = (event.target as IDBOpenDBRequest).transaction?.objectStore(STORE_FILES);
        if (!existing || existing.keyPath !== 'cacheKey') {
          db.deleteObjectStore(STORE_FILES);
        }
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'cacheKey' });
      }
    };

    // Another tab still holds the v1 database open: fail soft (no cache) instead of hanging.
    request.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another open tab'));
    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event: any) => reject(event.target.error);
  });
}

export async function saveLocalBook(book: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_BOOKS], 'readwrite');
      const store = tx.objectStore(STORE_BOOKS);
      store.put(book);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save book to IndexedDB:', err);
  }
}

export async function getLocalBook(bookId: string): Promise<any | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_BOOKS], 'readonly');
      const store = tx.objectStore(STORE_BOOKS);
      const req = store.get(bookId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get book from IndexedDB:', err);
    return null;
  }
}

/** Cache a PDF for one (user, book). Without a logged-in user nothing is cached. */
export async function saveLocalPdfFile(
  bookId: string,
  file: Blob | ArrayBuffer,
  userId: string | null | undefined
): Promise<void> {
  if (!userId || !bookId) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const record: PdfCacheRecord = { cacheKey: pdfCacheKey(userId, bookId), userId, bookId, data: file, timestamp: Date.now() };
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save PDF blob to IndexedDB:', err);
  }
}

/** Cached PDF for exactly this (user, book), or null. Never falls back to another book. */
export async function getLocalPdfFile(
  bookId: string,
  userId: string | null | undefined
): Promise<Blob | ArrayBuffer | null> {
  if (!userId || !bookId) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES], 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const req = store.get(pdfCacheKey(userId, bookId));
      req.onsuccess = () =>
        resolve(isCacheRecordUsable(req.result, userId, bookId) ? (req.result.data as Blob | ArrayBuffer) : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get PDF blob from IndexedDB:', err);
    return null;
  }
}

/** Remove the cached PDF for one (user, book), e.g. after the server denied access. */
export async function removeLocalPdfFile(bookId: string, userId: string | null | undefined): Promise<void> {
  if (!userId || !bookId) return;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      tx.objectStore(STORE_FILES).delete(pdfCacheKey(userId, bookId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to remove PDF blob from IndexedDB:', err);
  }
}

/** Drop every cached PDF on this device (called on logout / forced 401 sign-out). */
export async function clearLocalPdfCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      tx.objectStore(STORE_FILES).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to clear PDF cache:', err);
  }
}



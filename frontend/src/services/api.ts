import { handleFallbackRequest } from './mockFallback';
import { clearLocalPdfCache } from '../utils/localBookStorage';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Whether the offline/mock fallback is allowed. The mock returns fake data and
 * writes to localStorage, which must NEVER masquerade as real persistence when
 * a real backend is configured. We disable it whenever an explicit VITE_API_URL
 * is provided, or when VITE_DISABLE_MOCK is set. This keeps the database as the
 * single source of truth and surfaces real errors instead of silent fake success.
 */
const MOCK_FALLBACK_ENABLED =
  import.meta.env.VITE_DISABLE_MOCK !== 'true' && !import.meta.env.VITE_API_URL;

/** True only in the explicit offline demo mode (no VITE_API_URL). Real-backend mode never uses mock data. */
export const IS_DEMO_MOCK_MODE = MOCK_FALLBACK_ENABLED;

/**
 * Resolve a possibly-relative asset path (e.g. "/uploads/book-123.pdf")
 * returned by the backend into an absolute URL against the API origin.
 * Already-absolute URLs (http/https/blob/data) are returned unchanged.
 */
export const resolveAssetUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

class ApiClient {
  private getHeaders(customHeaders: Record<string, string> = {}): HeadersInit {
    const token = localStorage.getItem('elune_token');
    const headers: Record<string, string> = {
      ...customHeaders,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isLocalApi = API_BASE_URL.startsWith('http://localhost') || API_BASE_URL.startsWith('http://127.0.0.1');

    // If running on HTTPS (e.g. Vercel) and API URL is HTTP localhost,
    // browsers block this as Mixed Content / Private Network Access.
    // Instead of letting fetch hang indefinitely, immediately use fallback:
    if (isHttpsOrigin && isLocalApi && MOCK_FALLBACK_ENABLED) {
      return handleFallbackRequest<T>(endpoint, options);
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers = this.getHeaders(options.headers as Record<string, string>);

    // Add AbortController timeout to prevent hanging connections
    const controller = new AbortController();
    const isUpload = options.body instanceof FormData;
    const { timeoutMs: requestedTimeoutMs, ...fetchOptions } = options;
    // Uploads pass a size-aware timeout (see utils/uploadReliability.ts).
    const timeoutMs = requestedTimeoutMs ?? (isUpload ? 60000 : 6000);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          ...headers,
          ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        },
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('elune_token');
          localStorage.removeItem('elune_user');
          // Session invalidated: drop cached private PDFs too.
          void clearLocalPdfCache();
        }
        // Keep the HTTP status and server error code so callers can react precisely.
        throw Object.assign(new Error(data.message || data.error || `HTTP ${response.status}`), {
          status: response.status,
          code: typeof data.error === 'string' ? data.error : undefined,
        });
      }

      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);

      // If error was returned by an active server (e.g. validation error, 401), rethrow it
      if (
        err.message &&
        !err.message.includes('Failed to fetch') &&
        !err.message.includes('NetworkError') &&
        !err.message.includes('Load failed') &&
        !err.message.includes('aborted') &&
        err.name !== 'AbortError'
      ) {
        throw err;
      }

      // Network unreachable or timed out.
      // Only fall back to local mock storage when it is explicitly allowed
      // (no real backend configured). Otherwise surface the real error so the
      // UI never shows fake success or silently substitutes hardcoded data.
      if (!MOCK_FALLBACK_ENABLED) {
        const isTimeout = err.name === 'AbortError' || (err.message || '').includes('aborted');
        throw Object.assign(
          new Error(
            isTimeout
              ? 'The server took too long to respond. Please check your connection and try again.'
              : 'Unable to reach the server. Please check your connection and try again.'
          ),
          { code: isTimeout ? 'CLIENT_TIMEOUT' : 'NETWORK_ERROR' }
        );
      }
      console.warn(`API unreachable or timed out (${url}), utilizing client sanctuary storage.`);
      return handleFallbackRequest<T>(endpoint, options);
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// Auth Service
export const authService = {
  login: (data: { email: string; password: string }) =>
    api.post<{ success: boolean; data: { user: any; token: string } }>('/api/auth/login', data),

  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ success: boolean; data: { user: any; token: string } }>('/api/auth/register', data),

  me: () =>
    api.get<{ success: boolean; data: { user: any } }>('/api/auth/me'),

  logout: () =>
    api.post<{ success: boolean; message: string }>('/api/auth/logout'),
};

// Book Service
export const bookService = {
  getExplore: (params: { search?: string; categoryId?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    return api.get<{ success: boolean; data: { books: any[]; pagination: any } }>(`/api/books?${query.toString()}`);
  },

  getById: (bookId: string) =>
    api.get<{ success: boolean; data: { book: any } }>(`/api/books/${bookId}`),

  upload: (formData: FormData, opts: { timeoutMs?: number } = {}) =>
    api.request<{ success: boolean; data: { book: any; deduplicated?: boolean }; message: string }>('/api/books/upload', {
      method: 'POST',
      body: formData,
      timeoutMs: opts.timeoutMs,
    }),

  /** Server-side state of an upload attempt (owner-scoped); used to reconcile after a timeout. */
  getUploadStatus: (clientUploadId: string) =>
    api.get<{ success: boolean; data: { status: 'completed' | 'processing' | 'failed' | 'unknown'; book?: any } }>(
      `/api/books/upload-status/${encodeURIComponent(clientUploadId)}`
    ),

  getMyUploads: () =>
    api.get<{ success: boolean; data: { books: any[] } }>('/api/books/my-uploads'),
};

// Library Service
export const libraryService = {
  getMyLibrary: () =>
    api.get<{ success: boolean; data: { library: any[] } }>('/api/library'),

  addToLibrary: (bookId: string) =>
    api.post<{ success: boolean; message: string }>(`/api/library/${bookId}`),

  removeFromLibrary: (bookId: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/library/${bookId}`),
};

// Reader Service
export const readerService = {
  getReaderData: (bookId: string) =>
    api.get<{
      success: boolean;
      data: {
        book: any;
        chapters?: any[];
        readingProgress: any;
        bookmarks?: any[];
        notes?: any[];
        userBookmarks?: any[];
        userNotes?: any[];
        audioSegments?: any[];
      };
    }>(`/api/reader/${bookId}`),

  getBookContent: (bookId: string) =>
    api.get<{
      success: boolean;
      data: {
        book: any;
        chapters: any[];
        pages: number;
        totalBlocks: number;
      };
    }>(`/api/books/${bookId}/content`),

  saveProgress: (
    bookId: string,
    data: {
      chapterId?: string;
      contentBlockId?: string;
      pageNumber: number;
      progressPercentage: number;
    }
  ) =>
    api.post<{ success: boolean; data: { progress: any } }>(`/api/reader/${bookId}/progress`, data),
};

// Bookmark Service
export const bookmarkService = {
  getBookmarksByBook: (bookId: string) =>
    api.get<{ success: boolean; data: { bookmarks: any[] } }>(`/api/books/${bookId}/bookmarks`),

  getAllBookmarks: () =>
    api.get<{ success: boolean; data: { bookmarks: any[] } }>('/api/bookmarks'),

  createBookmark: (
    bookId: string,
    data: {
      chapterId: string;
      contentBlockId: string;
      pageNumber: number;
      note?: string;
    }
  ) =>
    api.post<{ success: boolean; data: { bookmark: any } }>(`/api/books/${bookId}/bookmarks`, data),

  deleteBookmark: (bookmarkId: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/bookmarks/${bookmarkId}`),
};

// Note Service
export const noteService = {
  getNotesByBook: (bookId: string) =>
    api.get<{ success: boolean; data: { notes: any[] } }>(`/api/books/${bookId}/notes`),

  getAllNotes: () =>
    api.get<{ success: boolean; data: { notes: any[] } }>('/api/notes'),

  createNote: (
    bookId: string,
    data: {
      chapterId: string;
      contentBlockId: string;
      pageNumber: number;
      content: string;
    }
  ) =>
    api.post<{ success: boolean; data: { note: any } }>(`/api/books/${bookId}/notes`, data),

  updateNote: (noteId: string, content: string) =>
    api.put<{ success: boolean; data: { note: any } }>(`/api/notes/${noteId}`, { content }),

  deleteNote: (noteId: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/notes/${noteId}`),
};

// Audio Service
export const audioService = {
  getAudioForChapter: (bookId: string, chapterId: string) =>
    api.get<{
      success: boolean;
      data: {
        audioTrack: any;
        segments: any[];
      };
    }>(`/api/audio/${bookId}/${chapterId}`),
};

// AI Service
export const aiService = {
  summarizeBook: (bookId: string, refresh = false) =>
    api.post<{ success: boolean; data: any }>(`/api/ai/summarize/book/${bookId}${refresh ? '?refresh=true' : ''}`),

  summarizeChapter: (chapterId: string, refresh = false) =>
    api.post<{ success: boolean; data: any }>(`/api/ai/summarize/chapter/${chapterId}${refresh ? '?refresh=true' : ''}`),

  askQuestion: (bookId: string, question: string) =>
    api.post<{ success: boolean; data: { chat: any } }>(`/api/ai/ask/${bookId}`, { question }),

  getFlashcards: (bookId: string) =>
    api.post<{ success: boolean; data: { flashcards: any[] } }>(`/api/ai/flashcards/${bookId}`),

  getQuiz: (bookId: string) =>
    api.post<{ success: boolean; data: { quizzes: any[] } }>(`/api/ai/quiz/${bookId}`),

  getMindMap: (bookId: string) =>
    api.post<{ success: boolean; data: { mindmap: any } }>(`/api/ai/mindmap/${bookId}`),
};

// Admin Service
export const adminService = {
  getStatistics: () =>
    api.get<{ success: boolean; data: { statistics: any } }>('/api/admin/statistics'),

  getUsers: () =>
    api.get<{ success: boolean; data: { users: any[] } }>('/api/admin/users'),

  getAllBooks: () =>
    api.get<{ success: boolean; data: { books: any[] } }>('/api/admin/books'),

  getPendingBooks: () =>
    api.get<{ success: boolean; data: { pendingBooks: any[] } }>('/api/admin/books/pending'),

  approveBook: (bookId: string, notes?: string) =>
    api.put<{ success: boolean; data: { book: any }; message: string }>(`/api/admin/books/${bookId}/approve`, { notes }),

  rejectBook: (bookId: string, reason: string) =>
    api.put<{ success: boolean; data: { book: any }; message: string }>(`/api/admin/books/${bookId}/reject`, { reason }),

  reviewBook: (bookId: string, data: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) =>
    api.post<{ success: boolean; data: { book: any }; message: string }>(`/api/admin/books/${bookId}/review`, data),

  toggleVisibility: (bookId: string) =>
    api.post<{ success: boolean; data: { book: any }; message: string }>(`/api/admin/books/${bookId}/toggle-visibility`),
};

// Category Service
export const categoryService = {
  getAll: () =>
    api.get<{ success: boolean; data: { categories: any[] } }>('/api/categories'),

  create: (name: string, description?: string) =>
    api.post<{ success: boolean; data: { category: any } }>('/api/categories', { name, description }),
};

// User Service
export const userService = {
  getDashboard: () =>
    api.get<{ success: boolean; data: any }>('/api/user/dashboard'),
};

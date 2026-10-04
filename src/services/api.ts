import type { Highlight, ReadingHistoryItem } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('elune_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const api = {
  // --- Auth ---
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  async register(name: string, email: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // --- Books ---
  async getBooks(params?: { search?: string; category?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category && params.category !== 'All') searchParams.append('category', params.category);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = `${API_BASE}/api/books${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    return res.json();
  },

  async getBookById(id: string) {
    const res = await fetch(`${API_BASE}/api/books/${id}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async uploadBookFile(formData: FormData) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('elune_auth_token') : null;
    const res = await fetch(`${API_BASE}/api/books/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    return res.json();
  },

  // --- Library ---
  async getLibrary() {
    const res = await fetch(`${API_BASE}/api/library`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async addToLibrary(bookId: string) {
    const res = await fetch(`${API_BASE}/api/library/${bookId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async removeFromLibrary(bookId: string) {
    const res = await fetch(`${API_BASE}/api/library/${bookId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async toggleFavorite(bookId: string) {
    const res = await fetch(`${API_BASE}/api/library/favorite/${bookId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // --- Reading Progress ---
  async getProgress(bookId: string) {
    const res = await fetch(`${API_BASE}/api/books/${bookId}/progress`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async updateProgress(bookId: string, chapterIndex: number, pageNumber: number, percent: number) {
    const res = await fetch(`${API_BASE}/api/books/${bookId}/progress`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        currentChapter: chapterIndex,
        currentPage: pageNumber,
        progressPercentage: percent
      })
    });
    return res.json();
  },

  async getReadingHistory(): Promise<{ success: boolean; data?: { history: ReadingHistoryItem[] } }> {
    const res = await fetch(`${API_BASE}/api/books/history`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // --- Bookmarks & Highlights ---
  async getBookmarks(bookId: string) {
    const res = await fetch(`${API_BASE}/api/books/${bookId}/bookmarks`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async createBookmark(bookId: string, page: number, chapterId?: string, note?: string) {
    const res = await fetch(`${API_BASE}/api/books/${bookId}/bookmarks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ page, chapterId, note })
    });
    return res.json();
  },

  async deleteBookmark(bookmarkId: string) {
    const res = await fetch(`${API_BASE}/api/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getHighlights(): Promise<{ success: boolean; data?: { highlights: Highlight[] } }> {
    const res = await fetch(`${API_BASE}/api/highlights`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async createHighlight(highlight: Omit<Highlight, 'id' | 'createdAt'>) {
    const res = await fetch(`${API_BASE}/api/highlights`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(highlight)
    });
    return res.json();
  },

  async deleteHighlight(id: string) {
    const res = await fetch(`${API_BASE}/api/highlights/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // --- AI Companion ---
  async summarizeBook(bookId: string, refresh = false) {
    const res = await fetch(`${API_BASE}/api/ai/summarize/book/${bookId}${refresh ? '?refresh=true' : ''}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async summarizeChapter(chapterId: string, refresh = false) {
    const res = await fetch(`${API_BASE}/api/ai/summarize/chapter/${chapterId}${refresh ? '?refresh=true' : ''}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async askBookQuestion(bookId: string, question: string) {
    const res = await fetch(`${API_BASE}/api/ai/ask/${bookId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ question })
    });
    return res.json();
  },

  async getFlashcards(bookId: string) {
    const res = await fetch(`${API_BASE}/api/ai/flashcards/${bookId}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async generateFlashcards(bookId: string) {
    const res = await fetch(`${API_BASE}/api/ai/flashcards/${bookId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getQuiz(bookId: string) {
    const res = await fetch(`${API_BASE}/api/ai/quiz/${bookId}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async generateQuiz(bookId: string) {
    const res = await fetch(`${API_BASE}/api/ai/quiz/${bookId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async generateMindMap(bookId: string) {
    const res = await fetch(`${API_BASE}/api/ai/mindmap/${bookId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  }
};

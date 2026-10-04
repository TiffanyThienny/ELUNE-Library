const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = this.getHeaders(options.headers as Record<string, string>);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('elune_token');
        localStorage.removeItem('elune_user');
      }
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }

    return data;
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

  upload: (formData: FormData) =>
    api.post<{ success: boolean; data: { book: any }; message: string }>('/api/books/upload', formData),

  getMyUploads: () =>
    api.get<{ success: boolean; data: { books: any[] } }>('/api/books/my/uploads'),
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
        readingProgress: any;
        bookmarks: any[];
        notes: any[];
        audioSegments: any[];
      };
    }>(`/api/reader/${bookId}`),

  saveProgress: (
    bookId: string,
    data: {
      chapterId: string;
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
  summarizeBook: (bookId: string) =>
    api.post<{ success: boolean; data: { summary: any } }>(`/api/ai/summarize/book/${bookId}`),

  summarizeChapter: (chapterId: string) =>
    api.post<{ success: boolean; data: { summary: any } }>(`/api/ai/summarize/chapter/${chapterId}`),

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

  reviewBook: (bookId: string, data: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) =>
    api.post<{ success: boolean; data: { book: any }; message: string }>(`/api/admin/books/${bookId}/review`, data),
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

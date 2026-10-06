export type Role = 'USER' | 'ADMIN';

export type BookVisibility = 'PRIVATE' | 'PUBLIC';

export type BookStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type ContentBlockType = 'PARAGRAPH' | 'HEADING' | 'QUOTE' | 'LIST' | 'IMAGE';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  _count?: {
    books: number;
  };
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string | null;
  coverUrl?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  totalPages: number;
  language: string;
  categoryId?: string | null;
  category?: Category | null;
  uploadedBy: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
  visibility: BookVisibility;
  status: BookStatus;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  chapters?: Chapter[];
  isScanned?: boolean;
  processingStatus?: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED';
  processingError?: string | null;
  _count?: {
    bookmarks?: number;
    notes?: number;
    userBooks?: number;
  };
}

export interface ContentBlock {
  id: string;
  chapterId: string;
  blockIndex: number;
  type: ContentBlockType;
  text: string;
  pageNumber: number;
  startOffset?: number | null;
  endOffset?: number | null;
  createdAt: string;
}

export interface AudioSegment {
  id: string;
  audioTrackId: string;
  contentBlockId: string;
  startTime: number;
  endTime: number;
}

export interface AudioTrack {
  id: string;
  bookId: string;
  chapterId?: string | null;
  audioUrl: string;
  duration: number;
  createdAt: string;
  segments?: AudioSegment[];
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  chapterNumber: number;
  createdAt: string;
  updatedAt: string;
  contentBlocks?: ContentBlock[];
  audioTracks?: AudioTrack[];
}

export interface ReadingProgress {
  id: string;
  userId: string;
  bookId: string;
  currentChapterId?: string | null;
  currentContentBlockId?: string | null;
  currentPage: number;
  progressPercentage: number;
  lastReadAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  bookId: string;
  chapterId: string;
  contentBlockId: string;
  pageNumber: number;
  note?: string | null;
  createdAt: string;
  book?: {
    id: string;
    title: string;
    author: string;
    coverUrl?: string | null;
  };
  chapter?: {
    id: string;
    title: string;
    chapterNumber: number;
  };
  contentBlock?: ContentBlock;
}

export interface Note {
  id: string;
  userId: string;
  bookId: string;
  chapterId: string;
  contentBlockId: string;
  pageNumber: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  book?: {
    id: string;
    title: string;
    author: string;
    coverUrl?: string | null;
  };
  chapter?: {
    id: string;
    title: string;
    chapterNumber: number;
  };
  contentBlock?: ContentBlock;
}

export interface Summary {
  id: string;
  userId: string;
  bookId: string;
  chapterId?: string | null;
  summaryType: 'BOOK' | 'CHAPTER';
  content: string;
  createdAt: string;
}

export interface AIChatMessage {
  id: string;
  userId: string;
  bookId: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  userId: string;
  bookId: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface QuizOption {
  text: string;
  label: string;
}

export interface Quiz {
  id: string;
  userId: string;
  bookId: string;
  question: string;
  options: string[] | any;
  correctAnswer: string;
  explanation?: string | null;
  createdAt: string;
}

export interface MindMapNode {
  title: string;
  children?: MindMapNode[];
}

export interface AdminStats {
  totalUsers: number;
  totalBooks: number;
  publicBooks: number;
  privateBooks: number;
  pendingUploads: number;
  approvedBooks: number;
  rejectedBooks: number;
  totalAIRequests: number;
  activeReaders: number;
}

export interface UserDashboardData {
  stats: {
    booksRead: number;
    booksSaved: number;
    summaries: number;
    quizzesCompleted: number;
    bookmarks: number;
    notes: number;
  };
  continueReading: {
    bookId: string;
    title: string;
    author: string;
    coverUrl?: string | null;
    chapterId?: string | null;
    chapterTitle?: string | null;
    contentBlockId?: string | null;
    currentPage: number;
    progressPercentage: number;
    lastReadAt: string;
  }[];
  myLibrary: Book[];
  recentBookmarks: Bookmark[];
  recentNotes: Note[];
}

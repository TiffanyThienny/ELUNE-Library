import { Book, Category, Role, User } from '../types';

export const FALLBACK_CATEGORIES: Category[] = [
  { id: 'cat-philosophy', name: 'Philosophy', slug: 'philosophy', description: 'Ancient and modern philosophical inquiries into ethics and mind.', _count: { books: 1 } },
  { id: 'cat-psychology', name: 'Psychology', slug: 'psychology', description: 'Cognitive science, mindfulness, and mental sanctuaries.', _count: { books: 1 } },
  { id: 'cat-self-dev', name: 'Self Development', slug: 'self-development', description: 'Actionable frameworks for calm, deep work, and discipline.', _count: { books: 0 } },
  { id: 'cat-technology', name: 'Technology', slug: 'technology', description: 'AI, computing, and the ethics of digital innovation.', _count: { books: 0 } },
  { id: 'cat-literature', name: 'Literature', slug: 'literature', description: 'Classic and contemporary literary explorations.', _count: { books: 0 } }
];

export const FALLBACK_BOOKS: Book[] = [
  {
    id: 'meditations-aurelius',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    categoryId: 'cat-philosophy',
    category: FALLBACK_CATEGORIES[0],
    description: 'Personal notes on Stoic philosophy, self-mastery, emotional resilience, and ethical living in an unpredictable world.',
    coverUrl: null,
    totalPages: 120,
    language: 'English',
    fileType: 'CANONICAL',
    visibility: 'PUBLIC',
    status: 'APPROVED',
    uploadedBy: 'usr_admin',
    uploader: { id: 'usr_admin', name: 'Elunè Administrator', email: 'admin@elune.read' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    chapters: [
      {
        id: 'ch-med-1',
        bookId: 'meditations-aurelius',
        title: 'Debts and Lessons from My Elders',
        chapterNumber: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        contentBlocks: [
          {
            id: 'cb-med-1-1',
            chapterId: 'ch-med-1',
            blockIndex: 1,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'From my grandfather Verus, I learned good morals and the government of my temper. From the reputation and remembrance of my father, modesty and a manly character.',
            createdAt: '2026-01-01T00:00:00.000Z'
          },
          {
            id: 'cb-med-1-2',
            chapterId: 'ch-med-1',
            blockIndex: 2,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'From my mother, piety and beneficence, and abstinence, not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich.',
            createdAt: '2026-01-01T00:00:00.000Z'
          },
          {
            id: 'cb-med-1-3',
            chapterId: 'ch-med-1',
            blockIndex: 3,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil.',
            createdAt: '2026-01-01T00:00:00.000Z'
          },
          {
            id: 'cb-med-1-4',
            chapterId: 'ch-med-1',
            blockIndex: 4,
            type: 'PARAGRAPH',
            pageNumber: 2,
            text: 'But I have seen the beauty of good, and the ugliness of evil, and I have recognized that the wrongdoer has a nature related to my own — not of the same blood or birth, but the same mind, and possessing a share of the divine.',
            createdAt: '2026-01-01T00:00:00.000Z'
          },
          {
            id: 'cb-med-1-5',
            chapterId: 'ch-med-1',
            blockIndex: 5,
            type: 'PARAGRAPH',
            pageNumber: 2,
            text: 'And so none of them can hurt me. No one can implicate me in ugliness. Nor can I be angry at my relative, or hate him. We were born to work together like feet, hands, and the rows of the upper and lower teeth.',
            createdAt: '2026-01-01T00:00:00.000Z'
          }
        ]
      },
      {
        id: 'ch-med-2',
        bookId: 'meditations-aurelius',
        title: 'On the Ruling Mind & Tranquility',
        chapterNumber: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        contentBlocks: [
          {
            id: 'cb-med-2-1',
            chapterId: 'ch-med-2',
            blockIndex: 1,
            type: 'PARAGRAPH',
            pageNumber: 3,
            text: 'Perform every act of your life as if it were your last. Lay aside all carelessness, all passionate aversion to the commands of reason, all hypocrisy, self-love, and dissatisfaction with your own share.',
            createdAt: '2026-01-01T00:00:00.000Z'
          },
          {
            id: 'cb-med-2-2',
            chapterId: 'ch-med-2',
            blockIndex: 2,
            type: 'PARAGRAPH',
            pageNumber: 3,
            text: 'Remember how long you have put off these things, and how often you have received opportunities from the gods, and yet do not use them. A limit of time is fixed for you; if you do not use it for clearing away the clouds from your mind, it will go and never return.',
            createdAt: '2026-01-01T00:00:00.000Z'
          }
        ]
      }
    ]
  },
  {
    id: 'architecture-of-silence',
    title: 'The Architecture of Silence',
    author: 'Evelyn St. Claire',
    categoryId: 'cat-psychology',
    category: FALLBACK_CATEGORIES[1],
    description: 'An architectural exploration of quiet spaces, auditory sanctuaries, and how intentional stillness restores creative mental bandwidth in our noisy world.',
    coverUrl: null,
    totalPages: 140,
    language: 'English',
    fileType: 'CANONICAL',
    visibility: 'PUBLIC',
    status: 'APPROVED',
    uploadedBy: 'usr_admin',
    uploader: { id: 'usr_admin', name: 'Elunè Administrator', email: 'admin@elune.read' },
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    chapters: [
      {
        id: 'ch-silence-1',
        bookId: 'architecture-of-silence',
        title: 'The Overstimulated Mind',
        chapterNumber: 1,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        contentBlocks: [
          {
            id: 'cb-sil-1-1',
            chapterId: 'ch-silence-1',
            blockIndex: 1,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'Silence is not the absence of sound, but the presence of awareness. In an era dominated by rapid notifications and continuous sensory stimulation, true silence has transformed from a default condition into a deliberate sanctuary.',
            createdAt: '2026-01-02T00:00:00.000Z'
          },
          {
            id: 'cb-sil-1-2',
            chapterId: 'ch-silence-1',
            blockIndex: 2,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'When we create architectural nooks designed for sensory rest, cognitive fatigue dissipates. The human mind requires acoustic proportion just as much as optical clarity.',
            createdAt: '2026-01-02T00:00:00.000Z'
          }
        ]
      }
    ]
  }
];

export const FALLBACK_USERS: Record<string, { user: User; passwordHash: string }> = {
  'admin@elune.read': {
    user: {
      id: 'usr_admin',
      name: 'Elunè Administrator',
      email: 'admin@elune.read',
      role: 'ADMIN' as Role,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    passwordHash: 'admin123'
  },
  'demo@elune.read': {
    user: {
      id: 'usr_demo_eleanor',
      name: 'Eleanor Vance',
      email: 'demo@elune.read',
      role: 'USER' as Role,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    passwordHash: 'password123'
  },
  'user@elune.read': {
    user: {
      id: 'usr_standard',
      name: 'Marcus Chen',
      email: 'user@elune.read',
      role: 'USER' as Role,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    passwordHash: 'user123'
  }
};

export function handleFallbackRequest<T>(endpoint: string, options: RequestInit = {}): T {
  const method = (options.method || 'GET').toUpperCase();
  const [path, queryString] = endpoint.split('?');
  const query = new URLSearchParams(queryString || '');

  // 1. Auth Login
  if (path === '/api/auth/login' && method === 'POST') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const email = (body.email || '').toLowerCase().trim();
    const password = body.password || '';

    // Check predefined seed users
    const predefined = FALLBACK_USERS[email];
    if (predefined && predefined.passwordHash === password) {
      return {
        success: true,
        data: {
          user: predefined.user,
          token: `jwt_token_${predefined.user.id}`
        },
        message: 'Signed in successfully'
      } as T;
    }

    // Check localStorage registered users
    const registeredJson = localStorage.getItem('elune_registered_users');
    if (registeredJson) {
      const registered = JSON.parse(registeredJson);
      const found = registered.find((u: any) => u.email.toLowerCase() === email && u.password === password);
      if (found) {
        const { password: _, ...userWithoutPass } = found;
        return {
          success: true,
          data: {
            user: userWithoutPass,
            token: `jwt_token_${userWithoutPass.id}`
          },
          message: 'Signed in successfully'
        } as T;
      }
    }

    throw new Error('Invalid email or password credentials');
  }

  // 2. Auth Register
  if (path === '/api/auth/register' && method === 'POST') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const email = (body.email || '').toLowerCase().trim();
    const name = (body.name || '').trim();
    const password = body.password || '';

    if (!email || !password || !name) {
      throw new Error('Name, email, and password are required');
    }

    if (FALLBACK_USERS[email]) {
      throw new Error('A user with this email already exists');
    }

    const registeredJson = localStorage.getItem('elune_registered_users');
    const registered: any[] = registeredJson ? JSON.parse(registeredJson) : [];
    if (registered.some((u) => u.email.toLowerCase() === email)) {
      throw new Error('A user with this email already exists');
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name,
      email,
      role: 'USER',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    registered.push({ ...newUser, password });
    localStorage.setItem('elune_registered_users', JSON.stringify(registered));

    return {
      success: true,
      data: {
        user: newUser,
        token: `jwt_token_${newUser.id}`
      },
      message: 'User registered successfully'
    } as T;
  }

  // 3. Auth Me
  if (path === '/api/auth/me' && method === 'GET') {
    const saved = localStorage.getItem('elune_user');
    if (saved) {
      return { success: true, data: { user: JSON.parse(saved) } } as T;
    }
    throw new Error('Not authenticated');
  }

  // 4. Categories
  if (path === '/api/categories' && method === 'GET') {
    return {
      success: true,
      data: { categories: FALLBACK_CATEGORIES },
      message: 'Categories retrieved'
    } as T;
  }

  // 5. Books Catalog (Public Explore)
  if (path === '/api/books' && method === 'GET') {
    const search = query.get('search')?.toLowerCase().trim();
    const categoryId = query.get('categoryId')?.trim() || query.get('category')?.trim();

    // Combine fallback books with any approved user uploads
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const allBooks = [...FALLBACK_BOOKS, ...userUploads];

    // STRICT: Only PUBLIC and APPROVED
    let books = allBooks.filter(
      (b) => b.visibility === 'PUBLIC' && b.status === 'APPROVED'
    );

    if (search) {
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(search) ||
          b.author.toLowerCase().includes(search) ||
          (b.description && b.description.toLowerCase().includes(search)) ||
          (b.category && b.category.name.toLowerCase().includes(search))
      );
    }

    if (categoryId && categoryId !== 'all') {
      books = books.filter(
        (b) =>
          b.categoryId === categoryId ||
          (b.category?.slug && b.category.slug.toLowerCase() === categoryId.toLowerCase()) ||
          (b.category && b.category.name.toLowerCase() === categoryId.toLowerCase())
      );
    }

    return {
      success: true,
      data: {
        books,
        pagination: {
          total: books.length,
          page: 1,
          limit: 12,
          totalPages: 1
        }
      },
      message: 'Public books retrieved'
    } as T;
  }

  // 6. User Uploaded Books
  if (path === '/api/books/my/uploads' && method === 'GET') {
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    return {
      success: true,
      data: { books: userUploads },
      message: 'User uploads retrieved'
    } as T;
  }

  // 7. Upload Book
  if (path === '/api/books/upload' && method === 'POST') {
    let title = 'New Literature Volume';
    let author = 'You';
    let description = 'Uploaded by reader';
    let visibility = 'PRIVATE';
    let categoryId = 'cat-philosophy';
    let language = 'English';

    if (options.body instanceof FormData) {
      title = String(options.body.get('title') || title);
      author = String(options.body.get('author') || author);
      description = String(options.body.get('description') || description);
      visibility = String(options.body.get('visibility') || visibility);
      categoryId = String(options.body.get('categoryId') || categoryId);
      language = String(options.body.get('language') || language);
    }

    const currentUser = JSON.parse(localStorage.getItem('elune_auth_user') || '{}');
    const isAdmin = currentUser?.role === 'ADMIN';

    // Core rule: If admin uploads, it is ALWAYS PUBLIC and ALWAYS APPROVED
    if (isAdmin) {
      visibility = 'PUBLIC';
    }
    const status = isAdmin ? 'APPROVED' : (visibility === 'PUBLIC' ? 'PENDING' : 'APPROVED');

    const matchedCat = FALLBACK_CATEGORIES.find((c) => c.id === categoryId) || FALLBACK_CATEGORIES[0];

    const newBook: Book = {
      id: `uploaded-${Date.now()}`,
      title,
      author,
      description,
      categoryId,
      category: matchedCat,
      totalPages: 100,
      language,
      fileType: 'CANONICAL',
      visibility: visibility as any,
      status: status as any,
      uploadedBy: currentUser?.id || 'usr_current',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: [
        {
          id: `ch-up-${Date.now()}-1`,
          bookId: `uploaded-${Date.now()}`,
          chapterNumber: 1,
          title: 'Chapter 1: Opening Passages',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          contentBlocks: [
            {
              id: `cb-up-${Date.now()}-1`,
              chapterId: `ch-up-${Date.now()}-1`,
              blockIndex: 1,
              type: 'PARAGRAPH',
              pageNumber: 1,
              text: `Opening of "${title}". This canonical text has been processed and prepared for focused reading, margin notes, and interactive AI contemplation.`,
              createdAt: new Date().toISOString()
            }
          ]
        }
      ]
    };

    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    userUploads.unshift(newBook);
    localStorage.setItem('elune_user_uploads', JSON.stringify(userUploads));

    return {
      success: true,
      data: { book: newBook },
      message: 'Book uploaded successfully'
    } as T;
  }

  // 8. Book Detail by ID
  const bookMatch = path.match(/^\/api\/books\/([^\/]+)$/);
  if (bookMatch && method === 'GET') {
    const id = bookMatch[1];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const book = [...FALLBACK_BOOKS, ...userUploads].find((b) => b.id === id);
    if (!book) {
      throw new Error(`Book not found with ID ${id}`);
    }
    return {
      success: true,
      data: { book },
      message: 'Book details retrieved'
    } as T;
  }

  // 9. Reader Data
  const readerMatch = path.match(/^\/api\/reader\/([^\/]+)$/);
  if (readerMatch && method === 'GET') {
    const id = readerMatch[1];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const book = [...FALLBACK_BOOKS, ...userUploads].find((b) => b.id === id);
    if (!book) {
      throw new Error('Book not found');
    }

    const savedBookmarks = JSON.parse(localStorage.getItem('elune_bookmarks') || '[]');
    const bookBookmarks = savedBookmarks.filter((bm: any) => bm.bookId === id);

    const savedNotes = JSON.parse(localStorage.getItem('elune_notes') || '[]');
    const bookNotes = savedNotes.filter((n: any) => n.bookId === id);

    return {
      success: true,
      data: {
        book,
        readingProgress: {
          currentPage: 1,
          currentChapterId: book.chapters?.[0]?.id || null,
          progressPercentage: 20
        },
        bookmarks: bookBookmarks,
        notes: bookNotes,
        audioSegments: []
      },
      message: 'Reader data retrieved'
    } as T;
  }

  // 10. Personal Library
  if (path === '/api/library' && method === 'GET') {
    const savedLibraryIds: string[] = JSON.parse(localStorage.getItem('elune_library') || '["meditations-aurelius"]');
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const allAvailable = [...FALLBACK_BOOKS, ...userUploads];
    const libraryBooks = allAvailable.filter((b) => savedLibraryIds.includes(b.id));
    return {
      success: true,
      data: { library: libraryBooks },
      message: 'Library books retrieved'
    } as T;
  }

  if (path.startsWith('/api/library/') && method === 'POST') {
    const bookId = path.replace('/api/library/', '');
    const savedLibraryIds: string[] = JSON.parse(localStorage.getItem('elune_library') || '["meditations-aurelius"]');
    if (!savedLibraryIds.includes(bookId)) {
      savedLibraryIds.push(bookId);
      localStorage.setItem('elune_library', JSON.stringify(savedLibraryIds));
    }
    return { success: true, message: 'Saved to library' } as T;
  }

  if (path.startsWith('/api/library/') && method === 'DELETE') {
    const bookId = path.replace('/api/library/', '');
    const savedLibraryIds: string[] = JSON.parse(localStorage.getItem('elune_library') || '["meditations-aurelius"]');
    const updated = savedLibraryIds.filter((id) => id !== bookId);
    localStorage.setItem('elune_library', JSON.stringify(updated));
    return { success: true, message: 'Removed from library' } as T;
  }

  // 11. Bookmarks
  if (path === '/api/bookmarks' && method === 'GET') {
    const savedBookmarks: any[] = JSON.parse(
      localStorage.getItem('elune_bookmarks') ||
        JSON.stringify([
          {
            id: 'bm_default_1',
            bookId: 'meditations-aurelius',
            chapterId: 'ch-med-1',
            contentBlockId: 'cb-med-1-3',
            pageNumber: 1,
            note: 'Crucial morning perspective for peaceful interactions.',
            createdAt: '2026-01-01T08:00:00.000Z',
            book: { id: 'meditations-aurelius', title: 'Meditations' },
            chapter: { id: 'ch-med-1', title: 'Debts and Lessons from My Elders', chapterNumber: 1 },
            contentBlock: {
              id: 'cb-med-1-3',
              text: 'When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly.'
            }
          }
        ])
    );
    return { success: true, data: { bookmarks: savedBookmarks } } as T;
  }

  if (path.match(/\/api\/books\/[^\/]+\/bookmarks/) && method === 'POST') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const bookId = path.split('/')[3];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const targetBook = [...FALLBACK_BOOKS, ...userUploads].find((b) => b.id === bookId);
    const targetChapter = targetBook?.chapters?.find((c) => c.id === body.chapterId);
    const targetBlock = targetChapter?.contentBlocks?.find((cb) => cb.id === body.contentBlockId);

    const savedBookmarks: any[] = JSON.parse(localStorage.getItem('elune_bookmarks') || '[]');
    const newBm = {
      id: `bm_${Date.now()}`,
      bookId,
      chapterId: body.chapterId,
      contentBlockId: body.contentBlockId,
      pageNumber: body.pageNumber || 1,
      note: body.note || null,
      createdAt: new Date().toISOString(),
      book: { id: targetBook?.id || bookId, title: targetBook?.title || 'Book' },
      chapter: {
        id: targetChapter?.id || body.chapterId,
        title: targetChapter?.title || 'Chapter',
        chapterNumber: targetChapter?.chapterNumber || 1
      },
      contentBlock: {
        id: targetBlock?.id || body.contentBlockId,
        text: targetBlock?.text || 'Passage coordinate'
      }
    };
    savedBookmarks.unshift(newBm);
    localStorage.setItem('elune_bookmarks', JSON.stringify(savedBookmarks));
    return { success: true, data: { bookmark: newBm } } as T;
  }

  if (path.startsWith('/api/bookmarks/') && method === 'DELETE') {
    const bmId = path.replace('/api/bookmarks/', '');
    const savedBookmarks: any[] = JSON.parse(localStorage.getItem('elune_bookmarks') || '[]');
    const updated = savedBookmarks.filter((b) => b.id !== bmId);
    localStorage.setItem('elune_bookmarks', JSON.stringify(updated));
    return { success: true, message: 'Bookmark removed' } as T;
  }

  // 12. Notes
  if (path === '/api/notes' && method === 'GET') {
    const savedNotes: any[] = JSON.parse(
      localStorage.getItem('elune_notes') ||
        JSON.stringify([
          {
            id: 'note_default_1',
            bookId: 'meditations-aurelius',
            chapterId: 'ch-med-1',
            contentBlockId: 'cb-med-1-3',
            pageNumber: 1,
            content: 'Read this paragraph every morning before opening email or messages.',
            createdAt: '2026-01-01T08:30:00.000Z',
            updatedAt: '2026-01-01T08:30:00.000Z',
            book: { id: 'meditations-aurelius', title: 'Meditations' },
            chapter: { id: 'ch-med-1', title: 'Debts and Lessons from My Elders', chapterNumber: 1 },
            contentBlock: {
              id: 'cb-med-1-3',
              text: 'When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly.'
            }
          }
        ])
    );
    return { success: true, data: { notes: savedNotes } } as T;
  }

  if (path.match(/\/api\/books\/[^\/]+\/notes/) && method === 'POST') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const bookId = path.split('/')[3];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const targetBook = [...FALLBACK_BOOKS, ...userUploads].find((b) => b.id === bookId);
    const targetChapter = targetBook?.chapters?.find((c) => c.id === body.chapterId);
    const targetBlock = targetChapter?.contentBlocks?.find((cb) => cb.id === body.contentBlockId);

    const savedNotes: any[] = JSON.parse(localStorage.getItem('elune_notes') || '[]');
    const newNote = {
      id: `note_${Date.now()}`,
      bookId,
      chapterId: body.chapterId,
      contentBlockId: body.contentBlockId,
      pageNumber: body.pageNumber || 1,
      content: body.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      book: { id: targetBook?.id || bookId, title: targetBook?.title || 'Book' },
      chapter: {
        id: targetChapter?.id || body.chapterId,
        title: targetChapter?.title || 'Chapter',
        chapterNumber: targetChapter?.chapterNumber || 1
      },
      contentBlock: {
        id: targetBlock?.id || body.contentBlockId,
        text: targetBlock?.text || 'Passage coordinate'
      }
    };
    savedNotes.unshift(newNote);
    localStorage.setItem('elune_notes', JSON.stringify(savedNotes));
    return { success: true, data: { note: newNote } } as T;
  }

  if (path.startsWith('/api/notes/') && method === 'DELETE') {
    const noteId = path.replace('/api/notes/', '');
    const savedNotes: any[] = JSON.parse(localStorage.getItem('elune_notes') || '[]');
    const updated = savedNotes.filter((n) => n.id !== noteId);
    localStorage.setItem('elune_notes', JSON.stringify(updated));
    return { success: true, message: 'Note removed' } as T;
  }

  // 13. User Dashboard
  if (path === '/api/user/dashboard' && method === 'GET') {
    const savedLibraryIds: string[] = JSON.parse(localStorage.getItem('elune_library') || '["meditations-aurelius"]');
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const allAvailable = [...FALLBACK_BOOKS, ...userUploads];
    const myLibrary = allAvailable.filter((b) => savedLibraryIds.includes(b.id));

    const savedBookmarks = JSON.parse(localStorage.getItem('elune_bookmarks') || '[]');
    const savedNotes = JSON.parse(localStorage.getItem('elune_notes') || '[]');

    return {
      success: true,
      data: {
        stats: {
          booksRead: 1,
          booksSaved: myLibrary.length,
          summaries: 2,
          bookmarks: savedBookmarks.length || 1,
          notes: savedNotes.length || 1
        },
        continueReading: [
          {
            bookId: FALLBACK_BOOKS[0].id,
            title: FALLBACK_BOOKS[0].title,
            author: FALLBACK_BOOKS[0].author,
            coverUrl: FALLBACK_BOOKS[0].coverUrl,
            chapterId: FALLBACK_BOOKS[0].chapters?.[0]?.id || null,
            chapterTitle: FALLBACK_BOOKS[0].chapters?.[0]?.title || 'Debts and Lessons from My Elders',
            contentBlockId: FALLBACK_BOOKS[0].chapters?.[0]?.contentBlocks?.[0]?.id || null,
            currentPage: 1,
            progressPercentage: 25,
            lastReadAt: new Date().toISOString()
          }
        ],
        myLibrary,
        recentBookmarks: savedBookmarks.slice(0, 3),
        recentNotes: savedNotes.slice(0, 3)
      }
    } as T;
  }

  // 14. Admin Statistics & Management
  if (path === '/api/admin/statistics' && method === 'GET') {
    return {
      success: true,
      data: {
        statistics: {
          totalUsers: 3,
          totalBooks: 4,
          publicBooks: 2,
          privateBooks: 1,
          pendingUploads: 1,
          approvedBooks: 2,
          rejectedBooks: 1,
          totalAIRequests: 18,
          activeReaders: 3
        }
      }
    } as T;
  }

  if (path === '/api/admin/users' && method === 'GET') {
    return {
      success: true,
      data: {
        users: Object.values(FALLBACK_USERS).map((u) => u.user)
      }
    } as T;
  }

  if (path === '/api/admin/books' && method === 'GET') {
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    return {
      success: true,
      data: {
        books: [...FALLBACK_BOOKS, ...userUploads]
      }
    } as T;
  }

  if (path === '/api/admin/books/pending' && method === 'GET') {
    return {
      success: true,
      data: {
        pendingBooks: [
          {
            id: 'deep-work-focus',
            title: 'Deep Work and Peaceful Focus',
            author: 'Kaelen Mori',
            description: 'Submitted by user for public catalog review. Examines cognitive endurance and ritualized concentration.',
            visibility: 'PUBLIC',
            status: 'PENDING',
            uploader: { id: 'usr_standard', name: 'Marcus Chen', email: 'user@elune.read' },
            createdAt: new Date().toISOString()
          }
        ]
      }
    } as T;
  }

  // 15. AI Features (Summary, Scholar Chat, Flashcards, Mind Map)
  if (path.startsWith('/api/ai/summarize/book/') && method === 'POST') {
    return {
      success: true,
      data: {
        summary: {
          content: `✨ Executive AI Synthesis:
1. Core Theme: Cultivating mental stillness, inner resilience, and emotional composure in an unpredictable world.
2. Dichotomy of Control: Differentiating between events outside our power and our internal cognitive responses.
3. Daily Practice: Maintaining mindful attention (prosoche) and treating each encounter as an opportunity to practice virtue.`
        }
      },
      message: 'AI Summary generated'
    } as T;
  }

  if (path.startsWith('/api/ai/summarize/chapter/') && method === 'POST') {
    return {
      success: true,
      data: {
        summary: {
          content: 'Chapter Synthesis: Focuses on gratitude, ancestral virtue, and recognizing that difficult people act from ignorance of good and evil.'
        }
      },
      message: 'Chapter summary generated'
    } as T;
  }

  if (path.startsWith('/api/ai/ask/') && method === 'POST') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const question = body.question || 'How to find peace?';
    return {
      success: true,
      data: {
        chat: {
          id: `chat_${Date.now()}`,
          question,
          answer: `Scholar Companion: In response to "${question}" — The text teaches that peace is not found in favorable external circumstances, but within the inner citadel. When you control your interpretations and judgments, no external chaos can disturb your tranquility.`
        }
      },
      message: 'AI response generated'
    } as T;
  }

  if (path.startsWith('/api/ai/flashcards/') && method === 'POST') {
    return {
      success: true,
      data: {
        flashcards: [
          {
            question: 'What is the "Inner Citadel" according to Marcus Aurelius?',
            answer: 'The unassailable part of the rational mind that remains calm regardless of external events.'
          },
          {
            question: 'What does the Dichotomy of Control teach?',
            answer: 'Only our judgments, intentions, and reactions are within our control; external outcomes are not.'
          },
          {
            question: 'How should one view wrongdoers according to Meditations?',
            answer: 'As fellow humans blinded by ignorance of good and evil, who should be met with patience rather than anger.'
          }
        ]
      },
      message: 'Flashcards generated'
    } as T;
  }

  if (path.startsWith('/api/ai/mindmap/') && method === 'POST') {
    return {
      success: true,
      data: {
        mindmap: {
          title: 'Inner Sanctuary & Philosophy',
          children: [
            {
              title: 'Perception (Mind)',
              children: [{ title: 'Objective Analysis' }, { title: 'Dichotomy of Control' }]
            },
            {
              title: 'Action (Duty)',
              children: [{ title: 'Virtue in Practice' }, { title: 'Service to Community' }]
            },
            {
              title: 'Will (Acceptance)',
              children: [{ title: 'Amor Fati (Love of Fate)' }, { title: 'Transient Nature of Time' }]
            }
          ]
        }
      },
      message: 'Mind map generated'
    } as T;
  }

  // Default fallback response
  return { success: true, data: {}, message: 'Success' } as T;
}

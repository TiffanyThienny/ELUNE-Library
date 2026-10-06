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
  },
  {
    id: 'letters-lucilius-seneca',
    title: 'Letters from a Stoic',
    author: 'Lucius Annaeus Seneca',
    categoryId: 'cat-philosophy',
    category: FALLBACK_CATEGORIES[0],
    description: 'Timeless moral essays and letters addressed to Lucilius on the brevity of life, tranquility, friendship, and authentic virtue.',
    coverUrl: null,
    totalPages: 210,
    language: 'English',
    fileType: 'CANONICAL',
    visibility: 'PUBLIC',
    status: 'APPROVED',
    uploadedBy: 'usr_admin',
    uploader: { id: 'usr_admin', name: 'Elunè Administrator', email: 'admin@elune.read' },
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    chapters: [
      {
        id: 'ch-seneca-1',
        bookId: 'letters-lucilius-seneca',
        title: 'Letter I: On Saving Time',
        chapterNumber: 1,
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
        contentBlocks: [
          {
            id: 'cb-sen-1-1',
            chapterId: 'ch-seneca-1',
            blockIndex: 1,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'Continue to act thus, my dear Lucilius — set yourself free for your own sake; gather and save your time, which has hitherto been taken from you, or stolen, or has slipped away.',
            createdAt: '2026-01-03T00:00:00.000Z'
          },
          {
            id: 'cb-sen-1-2',
            chapterId: 'ch-seneca-1',
            blockIndex: 2,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'Nothing is ours except time alone. Nature has put us in possession of this fleeting and elusive property, from which whoever desires can drive us out.',
            createdAt: '2026-01-03T00:00:00.000Z'
          }
        ]
      }
    ]
  },
  {
    id: 'republic-plato',
    title: 'The Republic',
    author: 'Plato',
    categoryId: 'cat-philosophy',
    category: FALLBACK_CATEGORIES[0],
    description: 'Socratic dialogue on justice, the order and character of the ideal city-state, the Allegory of the Cave, and the philosophical soul.',
    coverUrl: null,
    totalPages: 340,
    language: 'English',
    fileType: 'CANONICAL',
    visibility: 'PUBLIC',
    status: 'APPROVED',
    uploadedBy: 'usr_admin',
    uploader: { id: 'usr_admin', name: 'Elunè Administrator', email: 'admin@elune.read' },
    createdAt: '2026-01-04T00:00:00.000Z',
    updatedAt: '2026-01-04T00:00:00.000Z',
    chapters: [
      {
        id: 'ch-rep-1',
        bookId: 'republic-plato',
        title: 'Book VII: The Allegory of the Cave',
        chapterNumber: 1,
        createdAt: '2026-01-04T00:00:00.000Z',
        updatedAt: '2026-01-04T00:00:00.000Z',
        contentBlocks: [
          {
            id: 'cb-rep-1-1',
            chapterId: 'ch-rep-1',
            blockIndex: 1,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'Behold! human beings living in an underground den, which has a mouth open towards the light and reaching all along the den; here they have been from their childhood.',
            createdAt: '2026-01-04T00:00:00.000Z'
          },
          {
            id: 'cb-rep-1-2',
            chapterId: 'ch-rep-1',
            blockIndex: 2,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'To them, I said, the truth would be literally nothing but the shadows of the images. When one is liberated and steps into the sunlight, their eyes are dazzled before perception awakens.',
            createdAt: '2026-01-04T00:00:00.000Z'
          }
        ]
      }
    ]
  },
  {
    id: 'art-of-war-sun-tzu',
    title: 'The Art of War',
    author: 'Sun Tzu',
    categoryId: 'cat-self-dev',
    category: FALLBACK_CATEGORIES[2],
    description: 'Canonical military treatise offering timeless strategy on positioning, preparedness, psychological insight, and winning without conflict.',
    coverUrl: null,
    totalPages: 95,
    language: 'English',
    fileType: 'CANONICAL',
    visibility: 'PUBLIC',
    status: 'APPROVED',
    uploadedBy: 'usr_admin',
    uploader: { id: 'usr_admin', name: 'Elunè Administrator', email: 'admin@elune.read' },
    createdAt: '2026-01-05T00:00:00.000Z',
    updatedAt: '2026-01-05T00:00:00.000Z',
    chapters: [
      {
        id: 'ch-war-1',
        bookId: 'art-of-war-sun-tzu',
        title: 'Chapter III: Attack by Stratagem',
        chapterNumber: 1,
        createdAt: '2026-01-05T00:00:00.000Z',
        updatedAt: '2026-01-05T00:00:00.000Z',
        contentBlocks: [
          {
            id: 'cb-war-1-1',
            chapterId: 'ch-war-1',
            blockIndex: 1,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'Hence to fight and conquer in all your battles is not supreme excellence; supreme excellence consists in breaking the enemy’s resistance without fighting.',
            createdAt: '2026-01-05T00:00:00.000Z'
          },
          {
            id: 'cb-war-1-2',
            chapterId: 'ch-war-1',
            blockIndex: 2,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'If you know the enemy and know yourself, you need not fear the result of a hundred battles. If you know yourself but not the enemy, for every victory gained you will also suffer a defeat.',
            createdAt: '2026-01-05T00:00:00.000Z'
          }
        ]
      }
    ]
  },
  {
    id: 'siddhartha-hesse',
    title: 'Siddhartha',
    author: 'Hermann Hesse',
    categoryId: 'cat-literature',
    category: FALLBACK_CATEGORIES[4],
    description: 'A lyrical novel dealing with the spiritual journey of self-discovery of a man living in ancient India during the time of the Gautama Buddha.',
    coverUrl: null,
    totalPages: 160,
    language: 'English',
    fileType: 'CANONICAL',
    visibility: 'PUBLIC',
    status: 'APPROVED',
    uploadedBy: 'usr_admin',
    uploader: { id: 'usr_admin', name: 'Elunè Administrator', email: 'admin@elune.read' },
    createdAt: '2026-01-06T00:00:00.000Z',
    updatedAt: '2026-01-06T00:00:00.000Z',
    chapters: [
      {
        id: 'ch-sid-1',
        bookId: 'siddhartha-hesse',
        title: 'The Brahmin’s Son',
        chapterNumber: 1,
        createdAt: '2026-01-06T00:00:00.000Z',
        updatedAt: '2026-01-06T00:00:00.000Z',
        contentBlocks: [
          {
            id: 'cb-sid-1-1',
            chapterId: 'ch-sid-1',
            blockIndex: 1,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'In the shade of the house, in the sunshine of the riverbank near the boats, in the shade of the Sal-wood forest, in the shade of the fig tree is where Siddhartha grew up.',
            createdAt: '2026-01-06T00:00:00.000Z'
          },
          {
            id: 'cb-sid-1-2',
            chapterId: 'ch-sid-1',
            blockIndex: 2,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'Knowledge can be communicated, but not wisdom. One can find it, live it, be fortified by it, do wonders through it, but one cannot speak and teach it.',
            createdAt: '2026-01-06T00:00:00.000Z'
          }
        ]
      }
    ]
  },
  {
    id: 'discourses-epictetus',
    title: 'Discourses and Enchiridion',
    author: 'Epictetus',
    categoryId: 'cat-philosophy',
    category: FALLBACK_CATEGORIES[0],
    description: 'Direct transcripts of the teachings of Epictetus focusing on what is within our control versus what is external, yielding freedom and tranquility.',
    coverUrl: null,
    totalPages: 185,
    language: 'English',
    fileType: 'CANONICAL',
    visibility: 'PUBLIC',
    status: 'APPROVED',
    uploadedBy: 'usr_admin',
    uploader: { id: 'usr_admin', name: 'Elunè Administrator', email: 'admin@elune.read' },
    createdAt: '2026-01-07T00:00:00.000Z',
    updatedAt: '2026-01-07T00:00:00.000Z',
    chapters: [
      {
        id: 'ch-epi-1',
        bookId: 'discourses-epictetus',
        title: 'Of the Things which are in Our Power',
        chapterNumber: 1,
        createdAt: '2026-01-07T00:00:00.000Z',
        updatedAt: '2026-01-07T00:00:00.000Z',
        contentBlocks: [
          {
            id: 'cb-epi-1-1',
            chapterId: 'ch-epi-1',
            blockIndex: 1,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'Some things are in our control and others not. Things in our control are opinion, pursuit, desire, aversion, and, in a word, whatever are our own actions.',
            createdAt: '2026-01-07T00:00:00.000Z'
          },
          {
            id: 'cb-epi-1-2',
            chapterId: 'ch-epi-1',
            blockIndex: 2,
            type: 'PARAGRAPH',
            pageNumber: 1,
            text: 'Things not in our control are body, property, reputation, command, and, in one word, whatever are not our own actions. Men are disturbed not by things, but by the view which they take of them.',
            createdAt: '2026-01-07T00:00:00.000Z'
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
    let visibility = 'PUBLIC';
    let categoryId = 'cat-philosophy';
    let language = 'English';
    let coverUrl: string | undefined = undefined;
    let totalPages = 24;
    let chapters: any[] = [];

    if (options.body instanceof FormData) {
      title = String(options.body.get('title') || title);
      author = String(options.body.get('author') || author);
      description = String(options.body.get('description') || description);
      visibility = String(options.body.get('visibility') || visibility);
      categoryId = String(options.body.get('categoryId') || categoryId);
      language = String(options.body.get('language') || language);
      const customCover = options.body.get('coverUrl');
      if (customCover && typeof customCover === 'string') {
        coverUrl = customCover;
      }
      const pagesStr = options.body.get('totalPages');
      if (pagesStr) {
        totalPages = parseInt(String(pagesStr), 10) || totalPages;
      }

      const extractedJson = options.body.get('extractedChapters');
      if (extractedJson) {
        try {
          const rawChapters = JSON.parse(String(extractedJson));
          if (Array.isArray(rawChapters) && rawChapters.length > 0) {
            chapters = rawChapters.map((ch: any, idx: number) => ({
              id: `ch-up-${Date.now()}-${idx + 1}`,
              bookId: `uploaded-${Date.now()}`,
              chapterNumber: ch.chapterNumber || idx + 1,
              title: ch.title || `Chapter ${idx + 1}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              contentBlocks: (ch.contentBlocks || []).map((cb: any, bIdx: number) => ({
                id: `cb-up-${Date.now()}-${idx + 1}-${bIdx + 1}`,
                chapterId: `ch-up-${Date.now()}-${idx + 1}`,
                blockIndex: cb.blockIndex || bIdx + 1,
                type: 'PARAGRAPH',
                pageNumber: cb.pageNumber || 1,
                text: cb.text || '',
                createdAt: new Date().toISOString(),
              })),
            }));
          }
        } catch (e) {
          console.warn('Failed to parse extractedChapters in mockFallback', e);
        }
      }
    }

    const currentUser = (() => {
      try {
        const saved = localStorage.getItem('elune_user') || localStorage.getItem('elune_auth_user');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();
    const isAdmin = currentUser?.role === 'ADMIN';

    // Core rule requested by user:
    // If admin uploads: ALWAYS PUBLIC and APPROVED
    // If user uploads:
    // - PRIVATE: immediately APPROVED and readable by owner!
    // - PUBLIC: PENDING (must wait for admin approval before others can see it)
    let finalVisibility = visibility;
    let status = 'APPROVED';

    if (isAdmin) {
      finalVisibility = 'PUBLIC';
      status = 'APPROVED';
    } else {
      if (String(visibility).toUpperCase() === 'PUBLIC') {
        finalVisibility = 'PUBLIC';
        status = 'PENDING';
      } else {
        finalVisibility = 'PRIVATE';
        status = 'APPROVED';
      }
    }

    const isScanned =
      (options.body instanceof FormData && options.body.get('isScanned') === 'true') ||
      chapters.length === 0;

    const matchedCat = FALLBACK_CATEGORIES.find((c) => c.id === categoryId) || FALLBACK_CATEGORIES[0];
    const newBookId = `uploaded-${Date.now()}`;

    // If document is scanned or has no extracted text, keep chapters empty (NO FAKE TEXT)
    if (isScanned) {
      chapters = [];
    }

    const newBook: Book = {
      id: newBookId,
      title,
      author,
      description,
      categoryId,
      category: matchedCat,
      coverUrl,
      totalPages,
      language,
      fileType: 'CANONICAL',
      visibility: finalVisibility as any,
      status: status as any,
      isScanned: isScanned,
      uploadedBy: currentUser?.id || currentUser?.email || 'usr_standard',
      uploader: {
        id: currentUser?.id || 'usr_standard',
        name: currentUser?.name || author || 'Marcus Chen',
        email: currentUser?.email || 'user@elune.read',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters,
    };

    // Save to user uploads
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    userUploads.unshift(newBook);
    localStorage.setItem('elune_user_uploads', JSON.stringify(userUploads));

    // Also automatically add to Saved Library so user sees it in both places
    const savedLib: Book[] = JSON.parse(localStorage.getItem('elune_my_library') || '[]');
    if (!savedLib.some((b) => b.id === newBook.id)) {
      savedLib.unshift(newBook);
      localStorage.setItem('elune_my_library', JSON.stringify(savedLib));
    }

    return {
      success: true,
      data: { book: newBook },
      message: 'Book uploaded and ingested successfully',
    } as T;
  }

  // Helper: Master Book Access Control for Mock/Offline Mode
  const canAccessMockBook = (targetBook: Book, currentUser: any): boolean => {
    // 1. PUBLIC + APPROVED is accessible to everyone
    if (targetBook.visibility === 'PUBLIC' && targetBook.status === 'APPROVED') {
      return true;
    }
    // 2. Admin has access to all volumes
    if (currentUser && currentUser.role === 'ADMIN') {
      return true;
    }
    // 3. Authenticated owner / uploader can access (whether PRIVATE, PENDING, or REJECTED)
    if (currentUser) {
      const uid = String(currentUser.id || '');
      const umail = String(currentUser.email || '').toLowerCase();
      const bUploaderId = String(targetBook.uploadedBy || '');
      const bUploaderEmail = String(targetBook.uploader?.email || '').toLowerCase();
      const bUploaderObjId = String(targetBook.uploader?.id || '');

      if (
        (bUploaderId && (bUploaderId === uid || bUploaderId.toLowerCase() === umail)) ||
        (bUploaderObjId && (bUploaderObjId === uid || bUploaderObjId.toLowerCase() === umail)) ||
        (bUploaderEmail && bUploaderEmail === umail)
      ) {
        return true;
      }
    }
    // 4. Session / local upload check: if uploaded in this browser, user always has access
    try {
      const localUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
      if (localUploads.some((b) => b.id === targetBook.id)) {
        return true;
      }
    } catch {
      // ignore
    }

    // 5. Fallback for demo guest session
    if (targetBook.uploadedBy === 'usr_current' || targetBook.uploader?.id === 'usr_current') {
      return true;
    }

    return false;
  };

  // 8. Book Detail by ID
  const bookMatch = path.match(/^\/api\/books\/([^\/]+)$/);
  if (bookMatch && method === 'GET') {
    const id = bookMatch[1];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const book = [...FALLBACK_BOOKS, ...userUploads].find((b) => b.id === id);
    if (!book) {
      throw new Error(`Book not found with ID ${id}`);
    }

    const currentUser = (() => {
      try {
        const saved = localStorage.getItem('elune_user') || localStorage.getItem('elune_auth_user');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();
    if (!canAccessMockBook(book, currentUser)) {
      throw new Error('Access denied. You do not have permission to view this volume.');
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

    const currentUser = (() => {
      try {
        const saved = localStorage.getItem('elune_user') || localStorage.getItem('elune_auth_user');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();
    if (!canAccessMockBook(book, currentUser)) {
      throw new Error('Access denied. You do not have permission to read this volume.');
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
    const currentUser = (() => {
      try {
        const saved = localStorage.getItem('elune_user') || localStorage.getItem('elune_auth_user');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();
    const savedLibraryIds: string[] = JSON.parse(localStorage.getItem('elune_library') || '["meditations-aurelius"]');
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const allAvailable = [...FALLBACK_BOOKS, ...userUploads];
    
    // User can see saved books that are PUBLIC+APPROVED or owned by them
    const libraryBooks = allAvailable.filter(
      (b) => savedLibraryIds.includes(b.id) && canAccessMockBook(b, currentUser)
    );
    return {
      success: true,
      data: { library: libraryBooks },
      message: 'Library books retrieved'
    } as T;
  }

  if (path.startsWith('/api/library/') && method === 'POST') {
    const bookId = path.replace('/api/library/', '');
    const currentUser = (() => {
      try {
        const saved = localStorage.getItem('elune_user') || localStorage.getItem('elune_auth_user');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const targetBook = [...FALLBACK_BOOKS, ...userUploads].find((b) => b.id === bookId);

    if (!targetBook || !canAccessMockBook(targetBook, currentUser)) {
      throw new Error('Access denied. You cannot save a private or unapproved volume.');
    }

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
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const pendingFromUploads = userUploads.filter((b) => b.status === 'PENDING');
    
    // Seed sample pending item if user hasn't submitted yet
    const pendingBooks = pendingFromUploads.length > 0
      ? pendingFromUploads
      : [
          {
            id: 'deep-work-focus',
            title: 'Deep Work and Peaceful Focus',
            author: 'Kaelen Mori',
            description: 'Submitted by user for public catalog review. Examines cognitive endurance and ritualized concentration.',
            visibility: 'PUBLIC',
            status: 'PENDING',
            uploader: { id: 'usr_standard', name: 'Marcus Chen', email: 'user@elune.read' },
            createdAt: new Date().toISOString(),
            chapters: [
              {
                id: 'ch-dw-1',
                bookId: 'deep-work-focus',
                chapterNumber: 1,
                title: 'Deep Work as a Superpower',
                contentBlocks: [
                  {
                    id: 'cb-dw-1-1',
                    chapterId: 'ch-dw-1',
                    blockIndex: 1,
                    type: 'PARAGRAPH',
                    pageNumber: 1,
                    text: 'The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy.',
                    createdAt: new Date().toISOString()
                  }
                ]
              }
            ]
          }
        ];

    return {
      success: true,
      data: { pendingBooks }
    } as T;
  }

  // Admin Review Book (Approve or Reject)
  const reviewMatch = path.match(/^\/api\/admin\/books\/([^\/]+)\/review$/);
  if (reviewMatch && method === 'POST') {
    const bookId = reviewMatch[1];
    const body = options.body ? JSON.parse(options.body as string) : {};
    const rawAction = String(body.action || '').toUpperCase();
    const isApprove = rawAction === 'APPROVE' || rawAction === 'APPROVED';
    const rejectionReason = body.rejectionReason;

    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    let target = userUploads.find((b) => b.id === bookId);

    if (!target) {
      // If it was the sample pending book, create it now
      target = {
        id: bookId,
        title: 'Deep Work and Peaceful Focus',
        author: 'Kaelen Mori',
        description: 'Submitted by user for public catalog review. Examines cognitive endurance and ritualized concentration.',
        categoryId: 'cat-self-dev',
        category: FALLBACK_CATEGORIES[2],
        totalPages: 110,
        language: 'English',
        fileType: 'CANONICAL',
        visibility: 'PUBLIC',
        status: isApprove ? 'APPROVED' : 'REJECTED',
        rejectionReason: isApprove ? undefined : (rejectionReason || 'Did not meet editorial standard.'),
        uploadedBy: 'usr_standard',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: [
          {
            id: `ch-${bookId}-1`,
            bookId,
            chapterNumber: 1,
            title: 'Deep Work as a Superpower',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            contentBlocks: [
              {
                id: `cb-${bookId}-1-1`,
                chapterId: `ch-${bookId}-1`,
                blockIndex: 1,
                type: 'PARAGRAPH',
                pageNumber: 1,
                text: 'The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy.',
                createdAt: new Date().toISOString()
              }
            ]
          }
        ]
      };
      userUploads.unshift(target);
    } else {
      if (isApprove) {
        target.status = 'APPROVED';
        target.visibility = 'PUBLIC'; // ALWAYS PUBLIC when approved by admin!
      } else {
        target.status = 'REJECTED';
        target.rejectionReason = rejectionReason || 'Content did not meet editorial guidelines.';
      }
    }

    localStorage.setItem('elune_user_uploads', JSON.stringify(userUploads));

    return {
      success: true,
      data: { book: target },
      message: isApprove
        ? 'Book approved and published to public explore catalog'
        : 'Book submission rejected'
    } as T;
  }

  // Admin Approve (PUT /api/admin/books/:id/approve)
  const approveMatch = path.match(/^\/api\/admin\/books\/([^\/]+)\/approve$/);
  if (approveMatch && method === 'PUT') {
    const bookId = approveMatch[1];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    let target = userUploads.find((b) => b.id === bookId);

    if (!target) {
      target = {
        id: bookId,
        title: 'Deep Work and Peaceful Focus',
        author: 'Kaelen Mori',
        description: 'Approved public volume.',
        categoryId: 'cat-self-dev',
        category: FALLBACK_CATEGORIES[2],
        totalPages: 110,
        language: 'English',
        fileType: 'CANONICAL',
        visibility: 'PUBLIC',
        status: 'APPROVED',
        uploadedBy: 'usr_standard',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      userUploads.unshift(target);
    } else {
      target.status = 'APPROVED';
      target.visibility = 'PUBLIC';
      target.rejectionReason = undefined;
    }

    localStorage.setItem('elune_user_uploads', JSON.stringify(userUploads));
    return {
      success: true,
      data: { book: target },
      message: 'Book approved and published to public explore catalog'
    } as T;
  }

  // Admin Reject (PUT /api/admin/books/:id/reject)
  const rejectMatch = path.match(/^\/api\/admin\/books\/([^\/]+)\/reject$/);
  if (rejectMatch && method === 'PUT') {
    const bookId = rejectMatch[1];
    const body = options.body ? JSON.parse(options.body as string) : {};
    const rejectionReason = body.reason || body.notes || 'Did not meet catalog standards.';
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    let target = userUploads.find((b) => b.id === bookId);

    if (!target) {
      target = {
        id: bookId,
        title: 'Deep Work and Peaceful Focus',
        author: 'Kaelen Mori',
        description: 'Rejected volume.',
        categoryId: 'cat-self-dev',
        category: FALLBACK_CATEGORIES[2],
        totalPages: 110,
        language: 'English',
        fileType: 'CANONICAL',
        visibility: 'PUBLIC',
        status: 'REJECTED',
        rejectionReason,
        uploadedBy: 'usr_standard',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      userUploads.unshift(target);
    } else {
      target.status = 'REJECTED';
      target.visibility = 'PUBLIC';
      target.rejectionReason = rejectionReason;
    }

    localStorage.setItem('elune_user_uploads', JSON.stringify(userUploads));
    return {
      success: true,
      data: { book: target },
      message: 'Book submission rejected'
    } as T;
  }

  // Admin Toggle Book Visibility (Public <-> Private)
  const toggleVisibilityMatch = path.match(/^\/api\/admin\/books\/([^\/]+)\/toggle-visibility$/);
  if (toggleVisibilityMatch && method === 'POST') {
    const bookId = toggleVisibilityMatch[1];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    let target = userUploads.find((b) => b.id === bookId);

    if (!target) {
      const fb = FALLBACK_BOOKS.find((b) => b.id === bookId);
      if (fb) {
        target = JSON.parse(JSON.stringify(fb));
        userUploads.unshift(target!);
      }
    }

    if (target) {
      const newVisibility = target.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
      target.visibility = newVisibility as any;
      if (newVisibility === 'PUBLIC') {
        target.status = 'APPROVED'; // When set to public, guarantee status is APPROVED!
      }
      localStorage.setItem('elune_user_uploads', JSON.stringify(userUploads));
    }

    return {
      success: true,
      data: { book: target },
      message: `Book visibility changed to ${target?.visibility}`
    } as T;
  }

  // 15. Content & Audio Endpoints
  const contentEndpointMatch = path.match(/^\/api\/books\/([^\/]+)\/content$/);
  if (contentEndpointMatch && method === 'GET') {
    const bId = contentEndpointMatch[1];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const book = [...FALLBACK_BOOKS, ...userUploads].find((b) => b.id === bId);
    if (!book) throw new Error('Book not found');

    const chapters = book.chapters || [];
    const totalBlocks = chapters.reduce((acc, ch) => acc + (ch.contentBlocks?.length || 0), 0);

    return {
      success: true,
      data: {
        book,
        chapters,
        pages: book.totalPages || 1,
        totalBlocks,
      },
      message: 'Book content retrieved successfully',
    } as T;
  }

  const audioEndpointMatch = path.match(/^\/api\/books\/([^\/]+)\/audio$/);
  if (audioEndpointMatch && method === 'GET') {
    const bId = audioEndpointMatch[1];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const book = [...FALLBACK_BOOKS, ...userUploads].find((b) => b.id === bId);

    const tracks = (book?.chapters || []).map((ch, idx) => {
      let cumulativeTime = 0.0;
      const segments = (ch.contentBlocks || []).map((blk, bIdx) => {
        const words = (blk.text || '').split(/\s+/).length;
        const duration = Math.max(2.0, parseFloat((words / 2.5).toFixed(1)));
        const startTime = cumulativeTime;
        const endTime = parseFloat((cumulativeTime + duration).toFixed(1));
        cumulativeTime = endTime;
        return {
          id: `seg-${ch.id}-${blk.id || bIdx}`,
          audioTrackId: `track-${bId}-${ch.id}`,
          contentBlockId: blk.id,
          startTime,
          endTime,
        };
      });

      return {
        id: `track-${bId}-${ch.id}`,
        bookId: bId,
        chapterId: ch.id,
        audioUrl: `/audio/stream/${bId}/${ch.id}.mp3`,
        duration: cumulativeTime,
        segments,
      };
    });

    return {
      success: true,
      data: { tracks },
      message: 'Book audio tracks retrieved',
    } as T;
  }

  // 16. AI Features (Summary, Companion Q&A) grounded strictly in extracted book content
  const bookSummaryMatch = path.match(/^\/api\/ai\/summarize\/book\/([^\/]+)$/);
  if (bookSummaryMatch && method === 'POST') {
    const bId = bookSummaryMatch[1];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const book = [...FALLBACK_BOOKS, ...userUploads].find((b) => b.id === bId);
    if (!book) throw new Error('Book not found');

    const allBlocks = (book.chapters || []).flatMap((c) => c.contentBlocks || []);
    const fullText = allBlocks.map((b) => b.text).join(' ');

    if (!fullText || fullText.trim().length === 0 || fullText.includes('could not be converted into readable text')) {
      throw new Error('This book does not contain readable text, so AI summarization is unavailable.');
    }

    // Build authentic summary from the actual extracted text
    const keySentences = allBlocks
      .map((b) => b.text.trim())
      .filter((t) => t.length > 30)
      .slice(0, 4);

    const summaryContent = `Executive Synthesis for "${book.title}" (by ${book.author}):

• Core Theme:
${keySentences[0] || `An exploration of ${book.title}.`}

• Key Exposition:
${keySentences[1] || 'Detailed analysis of the opening themes.'}

• Continuing Arguments:
${keySentences[2] || keySentences[0] || 'Central tenets discussed in the volume.'}

• Principal Takeaway:
${keySentences[3] || 'Consolidation of perspectives and closing reflection.'}`;

    return {
      success: true,
      data: {
        summary: {
          content: summaryContent,
        },
      },
      message: 'AI Summary generated from document text',
    } as T;
  }

  const chapterSummaryMatch = path.match(/^\/api\/ai\/summarize\/chapter\/([^\/]+)$/);
  if (chapterSummaryMatch && method === 'POST') {
    const chId = chapterSummaryMatch[1];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const allBooks = [...FALLBACK_BOOKS, ...userUploads];
    let foundChapter: any = null;
    let parentBook: any = null;

    for (const b of allBooks) {
      const c = (b.chapters || []).find((chap: any) => chap.id === chId);
      if (c) {
        foundChapter = c;
        parentBook = b;
        break;
      }
    }

    if (!foundChapter) {
      return {
        success: true,
        data: {
          summary: {
            content: 'Chapter Synthesis: The ideas in this section examine foundational principles and provide practical guidance.',
          },
        },
        message: 'Chapter summary generated',
      } as T;
    }

    const blocks = foundChapter.contentBlocks || [];
    const text = blocks.map((b: any) => b.text).join(' ');

    if (!text || text.trim().length === 0 || text.includes('could not be converted into readable text')) {
      throw new Error('This chapter does not contain readable text for summarization.');
    }

    const firstFew = blocks.slice(0, 3).map((b: any) => b.text).join('\n\n');
    const chapterSummary = `Chapter Synthesis — "${foundChapter.title}":\n\nThis section addresses the following arguments from ${parentBook?.title || 'the volume'}:\n\n${firstFew.slice(0, 500)}...`;

    return {
      success: true,
      data: {
        summary: {
          content: chapterSummary,
        },
      },
      message: 'Chapter summary generated',
    } as T;
  }

  const askMatch = path.match(/^\/api\/ai\/ask\/([^\/]+)$/);
  if (askMatch && method === 'POST') {
    const bId = askMatch[1];
    const userUploads: Book[] = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
    const book = [...FALLBACK_BOOKS, ...userUploads].find((b) => b.id === bId);
    const body = options.body ? JSON.parse(options.body as string) : {};
    const question = (body.question || '').trim();

    if (!book) throw new Error('Book not found');

    const allBlocks = (book.chapters || []).flatMap((c) => c.contentBlocks || []);
    if (allBlocks.length === 0 || allBlocks.every((b) => b.text.includes('could not be converted into readable text'))) {
      throw new Error('This book does not contain readable text.');
    }

    // Search text blocks for relevant words
    const keywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3 && !['what', 'when', 'where', 'which', 'about', 'this', 'does', 'that'].includes(w));

    let matchedBlock = allBlocks.find((b) =>
      keywords.some((k: string) => b.text.toLowerCase().includes(k))
    );

    let answer = '';
    if (matchedBlock) {
      answer = `Based on the text of "${book.title}":\n\n"${matchedBlock.text}"\n\nIn this section, ${book.author} addresses this topic directly.`;
    } else if (keywords.length === 0 && allBlocks.length > 0) {
      answer = `In "${book.title}", ${book.author} focuses on:\n\n"${allBlocks[0].text.slice(0, 300)}..."`;
    } else {
      answer = 'The answer could not be found in this book.';
    }

    return {
      success: true,
      data: {
        chat: {
          id: `chat_${Date.now()}`,
          question,
          answer,
        },
      },
      message: 'AI response generated',
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

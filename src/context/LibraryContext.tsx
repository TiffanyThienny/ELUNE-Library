import React, { createContext, useContext, useState } from 'react';
import type { Book, PageView, ReaderSettings, AudioState, Highlight, ReadingHistoryItem } from '../types';
import { INITIAL_BOOKS } from '../data/mockBooks';
import { api } from '../services/api';

interface LibraryContextType {
  books: Book[];
  currentView: PageView;
  activeBook: Book;
  favoriteIds: string[];
  savedSummaryIds: string[];
  uploadedBooks: Book[];
  readingHistory: ReadingHistoryItem[];
  highlights: Highlight[];
  readerSettings: ReaderSettings;
  audioState: AudioState;
  searchQuery: string;
  appTheme: 'light' | 'dark';

  // Actions
  navigateTo: (view: PageView, bookId?: string) => void;
  toggleFavorite: (bookId: string) => void;
  toggleSaveSummary: (bookId: string) => void;
  toggleAppTheme: () => void;
  addUploadedBook: (newBook: Book) => void;
  removeUploadedBook: (bookId: string) => void;
  addHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => void;
  deleteHighlight: (id: string) => void;
  updateReaderSettings: (newSettings: Partial<ReaderSettings>) => void;
  updateReadingProgress: (bookId: string, chapterIndex: number, pageNumber: number, percent: number) => void;
  playAudioTrack: (book: Book, type: 'book' | 'chapter' | 'summary', title?: string, textContent?: string) => void;
  toggleAudioPlayPause: () => void;
  setAudioSpeed: (speed: 0.75 | 1 | 1.25 | 1.5 | 2) => void;
  seekAudio: (time: number) => void;
  stopAudio: () => void;
  openAudioModal: () => void;
  closeAudioModal: () => void;
  setSearchQuery: (query: string) => void;
}

const defaultReaderSettings: ReaderSettings = {
  fontFamily: 'Literata',
  fontSize: 18,
  lineHeight: 1.8,
  theme: 'light'
};

const defaultAudioState: AudioState = {
  isPlaying: false,
  trackTitle: '',
  bookTitle: '',
  bookId: '',
  coverBg: '',
  currentTime: 0,
  duration: 300,
  speed: 1,
  isModalOpen: false,
  type: 'book'
};

const INITIAL_HISTORY: ReadingHistoryItem[] = [
  {
    id: 'h-1',
    bookId: 'meditations-aurelius',
    bookTitle: 'Meditations',
    author: 'Marcus Aurelius',
    coverBg: 'linear-gradient(135deg, #4A3E3D 0%, #2A2120 100%)',
    chapterTitle: 'Debts and Lessons from My Elders',
    percent: 24,
    lastOpened: '2 hours ago',
    timePeriod: 'Today'
  },
  {
    id: 'h-2',
    bookId: 'architecture-of-silence',
    bookTitle: 'The Architecture of Silence',
    author: 'Evelyn St. Claire',
    coverBg: 'linear-gradient(135deg, #CDB891 0%, #A6916B 100%)',
    chapterTitle: 'Designing Sacral Quiet Spaces',
    percent: 42,
    lastOpened: 'Yesterday at 9:15 PM',
    timePeriod: 'Yesterday'
  },
  {
    id: 'h-3',
    bookId: 'art-of-clarity',
    bookTitle: 'The Art of Clear Thinking',
    author: 'Clara V. Vance',
    coverBg: 'linear-gradient(135deg, #C3B091 0%, #8C785B 100%)',
    chapterTitle: 'First Principles Thinking',
    percent: 55,
    lastOpened: 'Sep 18, 2026',
    timePeriod: 'This Week'
  }
];

const INITIAL_HIGHLIGHTS: Highlight[] = [
  {
    id: 'hl-1',
    bookId: 'meditations-aurelius',
    bookTitle: 'Meditations',
    chapterId: 'ch-1',
    chapterTitle: 'Debts and Lessons from My Elders',
    text: 'When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly...',
    color: 'yellow',
    note: 'Essential morning perspective for peaceful interactions.',
    createdAt: '2 hours ago'
  },
  {
    id: 'hl-2',
    bookId: 'architecture-of-silence',
    bookTitle: 'The Architecture of Silence',
    chapterId: 'silence-1',
    chapterTitle: 'The Overstimulated Mind',
    text: 'Silence is not the absence of sound, but the presence of awareness.',
    color: 'green',
    note: 'A beautiful definition to remember.',
    createdAt: 'Yesterday'
  }
];

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [activeBookId, setActiveBookId] = useState<string>('meditations-aurelius');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(['meditations-aurelius', 'architecture-of-silence']);
  const [savedSummaryIds, setSavedSummaryIds] = useState<string[]>(['meditations-aurelius', 'deep-work-mastery']);
  const [readingHistory] = useState<ReadingHistoryItem[]>(INITIAL_HISTORY);
  const [highlights, setHighlights] = useState<Highlight[]>(INITIAL_HIGHLIGHTS);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(defaultReaderSettings);
  const [audioState, setAudioState] = useState<AudioState>(defaultAudioState);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appTheme, setAppTheme] = useState<'light' | 'dark'>('light');

  // Load books & highlights from Backend API on mount
  React.useEffect(() => {
    let isMounted = true;
    api.getBooks({ limit: 50 })
      .then((res) => {
        if (isMounted && res?.success && res.data && Array.isArray(res.data.books) && res.data.books.length > 0) {
          setBooks(res.data.books);
        }
      })
      .catch(() => {
        // Safe offline fallback: keep mock books
      });

    api.getHighlights()
      .then((res) => {
        if (isMounted && res?.success && res.data && Array.isArray(res.data.highlights) && res.data.highlights.length > 0) {
          setHighlights(res.data.highlights);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleAppTheme = () => {
    setAppTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const activeBook = books.find(b => b.id === activeBookId) || books[0];
  const uploadedBooks = books.filter(b => b.isUploaded);

  const navigateTo = (view: PageView, bookId?: string) => {
    if (bookId) {
      setActiveBookId(bookId);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFavorite = (bookId: string) => {
    setFavoriteIds(prev => 
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
    api.toggleFavorite(bookId).catch(() => {});
  };

  const toggleSaveSummary = (bookId: string) => {
    setSavedSummaryIds(prev =>
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  const addUploadedBook = (newBook: Book) => {
    setBooks(prev => [newBook, ...prev]);
    setActiveBookId(newBook.id);
  };

  const removeUploadedBook = (bookId: string) => {
    setBooks(prev => prev.filter(b => b.id !== bookId));
    setFavoriteIds(prev => prev.filter(id => id !== bookId));
    setSavedSummaryIds(prev => prev.filter(id => id !== bookId));
    if (activeBookId === bookId) {
      setActiveBookId(INITIAL_BOOKS[0].id);
    }
  };

  const addHighlight = (hl: Omit<Highlight, 'id' | 'createdAt'>) => {
    const newHighlight: Highlight = {
      ...hl,
      id: `hl-${Date.now()}`,
      createdAt: 'Just now'
    };
    setHighlights(prev => [newHighlight, ...prev]);
    api.createHighlight(hl).catch(() => {});
  };

  const deleteHighlight = (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    api.deleteHighlight(id).catch(() => {});
  };

  const updateReaderSettings = (newSettings: Partial<ReaderSettings>) => {
    setReaderSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateReadingProgress = (bookId: string, chapterIndex: number, pageNumber: number, percent: number) => {
    setBooks(prev => prev.map(b => {
      if (b.id === bookId) {
        return {
          ...b,
          progress: {
            chapterIndex,
            pageNumber,
            percent,
            lastRead: 'Just now'
          }
        };
      }
      return b;
    }));
    api.updateProgress(bookId, chapterIndex, pageNumber, percent).catch(() => {});
  };

  // Web Speech Synthesis & Timer Refs
  const currentUtteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const speechTextRef = React.useRef<string>('');
  const speechIntervalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }
    };
  }, []);

  const clearSpeechInterval = () => {
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }
  };

  const playAudioTrack = (
    book: Book, 
    type: 'book' | 'chapter' | 'summary', 
    title?: string,
    textContent?: string
  ) => {
    const cleanTitle = book.title.replace(/\.(pdf|epub)$/i, '').replace(/_/g, ' ');
    const isSummary = type === 'summary';
    const trackName = title 
      ? title.replace(/\.(pdf|epub)$/i, '').replace(/_/g, ' ') 
      : (isSummary ? `${cleanTitle} (Summary Audio)` : `${cleanTitle} (Full Book)`);

    // Extract exact text to be read by TTS
    let textToRead = textContent || '';
    if (!textToRead) {
      if (type === 'summary') {
        textToRead = `${cleanTitle} summary. ${book.summary.quickOverview}. Main ideas: ${book.summary.mainIdeas.join('. ')}`;
      } else if (type === 'chapter') {
        const ch = book.chapters[0];
        textToRead = `Chapter ${ch.number}: ${ch.title}. ${ch.content}`;
      } else {
        // Full book narration
        textToRead = `${cleanTitle} by ${book.author}. ${book.chapters.map(c => `Chapter ${c.number}: ${c.title}. ${c.content}`).join(' ')}`;
      }
    }

    speechTextRef.current = textToRead;

    // Estimate duration based on word count (avg 150 words/min = 2.5 words/sec)
    const wordsCount = textToRead.split(/\s+/).length;
    const estimatedDuration = Math.max(30, Math.ceil(wordsCount / 2.5));

    clearSpeechInterval();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = audioState.speed;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      // Pick clear English voice if available
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')));
      if (engVoice) {
        utterance.voice = engVoice;
      }

      utterance.onend = () => {
        clearSpeechInterval();
        setAudioState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
      };

      utterance.onerror = (e) => {
        console.log('Speech synthesis error:', e);
        clearSpeechInterval();
        setAudioState(prev => ({ ...prev, isPlaying: false }));
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }

    setAudioState({
      isPlaying: true,
      trackTitle: trackName,
      bookTitle: cleanTitle,
      bookId: book.id,
      coverBg: book.coverBg,
      currentTime: 0,
      duration: estimatedDuration,
      speed: audioState.speed,
      isModalOpen: false,
      type
    });

    // Start progress timer
    speechIntervalRef.current = window.setInterval(() => {
      setAudioState(prev => {
        if (!prev.isPlaying) return prev;
        const nextTime = prev.currentTime + 1;
        if (nextTime >= prev.duration) {
          clearSpeechInterval();
          return { ...prev, isPlaying: false, currentTime: 0 };
        }
        return { ...prev, currentTime: nextTime };
      });
    }, 1000);
  };

  const toggleAudioPlayPause = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (audioState.isPlaying) {
        window.speechSynthesis.pause();
      } else {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else if (currentUtteranceRef.current) {
          window.speechSynthesis.speak(currentUtteranceRef.current);
        }
      }
    }
    setAudioState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const setAudioSpeed = (speed: 0.75 | 1 | 1.25 | 1.5 | 2) => {
    setAudioState(prev => ({ ...prev, speed }));
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && currentUtteranceRef.current) {
      window.speechSynthesis.cancel();
      const newUtterance = new SpeechSynthesisUtterance(speechTextRef.current);
      newUtterance.rate = speed;
      newUtterance.pitch = 1.0;
      newUtterance.lang = 'en-US';

      newUtterance.onend = () => {
        clearSpeechInterval();
        setAudioState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
      };

      currentUtteranceRef.current = newUtterance;
      window.speechSynthesis.speak(newUtterance);
    }
  };

  const seekAudio = (time: number) => {
    setAudioState(prev => ({ ...prev, currentTime: Math.max(0, Math.min(prev.duration, time)) }));
  };

  const stopAudio = () => {
    clearSpeechInterval();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setAudioState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      isModalOpen: false
    }));
  };

  const openAudioModal = () => {
    setAudioState(prev => ({ ...prev, isModalOpen: true }));
  };

  const closeAudioModal = () => {
    setAudioState(prev => ({ ...prev, isModalOpen: false }));
  };

  return (
    <LibraryContext.Provider
      value={{
        books,
        currentView,
        activeBook,
        favoriteIds,
        savedSummaryIds,
        uploadedBooks,
        readingHistory,
        highlights,
        readerSettings,
        audioState,
        searchQuery,
        appTheme,
        navigateTo,
        toggleFavorite,
        toggleSaveSummary,
        toggleAppTheme,
        addUploadedBook,
        removeUploadedBook,
        addHighlight,
        deleteHighlight,
        updateReaderSettings,
        updateReadingProgress,
        playAudioTrack,
        toggleAudioPlayPause,
        setAudioSpeed,
        seekAudio,
        stopAudio,
        openAudioModal,
        closeAudioModal,
        setSearchQuery
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

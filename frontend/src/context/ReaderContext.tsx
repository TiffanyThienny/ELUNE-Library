import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Book, Chapter, ContentBlock, AudioSegment, Bookmark, Note } from '../types';
import { readerService, bookmarkService, noteService, audioService, IS_DEMO_MOCK_MODE } from '../services/api';
import { computePageProgress } from '../utils/readingProgress';

interface ReaderContextType {
  book: Book | null;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  currentContentBlockId: string | null;
  currentPage: number;
  progressPercentage: number;
  loading: boolean;
  error: string | null;

  // Bookmarks & Notes
  bookmarks: Bookmark[];
  notes: Note[];
  isBookmarked: (contentBlockId: string) => boolean;
  getBookmark: (contentBlockId: string) => Bookmark | undefined;
  getNote: (contentBlockId: string) => Note | undefined;
  toggleBookmark: (contentBlockId: string, pageNumber: number, noteText?: string) => Promise<void>;
  saveNote: (contentBlockId: string, pageNumber: number, content: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;

  // Audio & Sync
  audioUrl: string | null;
  audioDuration: number;
  audioCurrentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  audioSegments: AudioSegment[];
  activeAudioSegment: AudioSegment | null;
  playAudio: () => void;
  pauseAudio: () => void;
  seekAudio: (seconds: number) => void;
  setSpeed: (speed: number) => void;
  jumpToParagraph: (contentBlockId: string, autoPlayAudio?: boolean, chapterId?: string) => void;
  nextParagraph: () => void;
  prevParagraph: () => void;

  // PDF page tracking + page bookmarks (single-reader model)
  setPdfPage: (page: number, totalPages?: number) => void;
  /** Ask the PDF viewer to navigate to a page (bookmarks, notes). */
  requestPdfPage: (page: number) => void;
  pageRequest: { page: number; nonce: number } | null;
  /** Add a note to a PDF page (anchored to the nearest text block on or before that page). */
  addPageNote: (page: number, content: string) => Promise<void>;
  canAddNotes: boolean;
  isPageBookmarked: (page: number) => boolean;
  togglePageBookmark: (page: number) => Promise<void>;

  // Summary (shared so audio can read exactly what the Summary panel shows)
  summaryText: string | null;
  setSummaryText: (text: string | null) => void;

  // Navigation
  selectChapter: (chapterId: string) => void;
  loadBook: (bookId: string) => Promise<void>;
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export const ReaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [currentContentBlockId, setCurrentContentBlockId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  // Page count reported by the PDF itself (authoritative over the DB value).
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [pageRequest, setPageRequest] = useState<{ page: number; nonce: number } | null>(null);

  // Audio states
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [audioSegments, setAudioSegments] = useState<AudioSegment[]>([]);
  const [activeAudioSegment, setActiveAudioSegment] = useState<AudioSegment | null>(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const saveTimeoutRef = useRef<any>(null);

  // Initialize Audio element once
  useEffect(() => {
    const audio = new Audio();
    audioElementRef.current = audio;

    const handleTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Stop TTS and reset audio when switching books
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
    }
    setIsPlaying(false);
    // Never let a previous book's summary linger (audio reads the summary).
    setSummaryText(null);
  }, [book?.id]);

  // Sync Audio Time -> Content Block (Paragraph) & Page
  useEffect(() => {
    if (!audioSegments || audioSegments.length === 0) return;

    // Find the segment that matches audioCurrentTime
    const matched = audioSegments.find(
      (seg) => audioCurrentTime >= seg.startTime && audioCurrentTime < seg.endTime
    );

    if (matched && matched.id !== activeAudioSegment?.id) {
      setActiveAudioSegment(matched);
      setCurrentContentBlockId(matched.contentBlockId);

      // Find the page number of this contentBlock
      if (currentChapter?.contentBlocks) {
        const blk = currentChapter.contentBlocks.find((b) => b.id === matched.contentBlockId);
        if (blk && blk.pageNumber) {
          setCurrentPage(blk.pageNumber);
        }
      }

      // Auto-scroll paragraph smoothly into view
      const elem = document.getElementById(`content-block-${matched.contentBlockId}`);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [audioCurrentTime, audioSegments, activeAudioSegment, currentChapter]);

  // ---- PDF reading progress -------------------------------------------------
  // Progress is derived ONLY from the real PDF page and the real page count:
  //   floor(currentPage / totalPages * 100), clamped to 0..100.
  // The indicator updates immediately; persistence is debounced, and a pending
  // save is flushed (never dropped) when the book changes or the reader unmounts.
  const pendingSaveRef = useRef<null | { bookId: string; payload: Parameters<typeof readerService.saveProgress>[1] }>(null);
  const progressReadyRef = useRef(false); // false until the saved position is restored

  const flushPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = null;
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (pending) {
      readerService.saveProgress(pending.bookId, pending.payload).catch((e) => console.error('Failed to save progress', e));
    }
  }, []);

  useEffect(() => {
    if (!book || !progressReadyRef.current) return;
    const total = pdfPageCount || book.totalPages || 0;
    const percentage = computePageProgress(currentPage, total);
    setProgressPercentage(percentage);

    pendingSaveRef.current = {
      bookId: book.id,
      payload: {
        chapterId: currentChapter?.id,
        contentBlockId: currentContentBlockId || undefined,
        pageNumber: currentPage,
        progressPercentage: percentage,
      },
    };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(flushPendingSave, 1200);
  }, [book?.id, currentPage, pdfPageCount, flushPendingSave]);

  // Flush the last position of the previous book before switching, and on unmount.
  useEffect(() => {
    return () => flushPendingSave();
  }, [book?.id, flushPendingSave]);

  // Load Book reader data
  const loadBook = async (bookId: string) => {
    // Save the previous book's final position, then reset per-book page state so
    // nothing from the previous book is reused (or saved under the new book).
    flushPendingSave();
    progressReadyRef.current = false;
    setPdfPageCount(0);
    setCurrentPage(1);
    setProgressPercentage(0);
    setLoading(true);
    setError(null);
    try {
      let loadedBook: any = null;
      let loadedChapters: Chapter[] = [];
      let loadedBookmarks: Bookmark[] = [];
      let loadedNotes: Note[] = [];
      let progress: any = null;

      try {
        const res = await readerService.getReaderData(bookId);
        if (res.success && res.data) {
          loadedBook = res.data.book || res.data;
          loadedChapters = loadedBook.chapters || res.data.chapters || [];
          loadedBookmarks = res.data.bookmarks || res.data.userBookmarks || [];
          loadedNotes = res.data.notes || res.data.userNotes || [];
          progress = res.data.readingProgress;
        }
      } catch (apiErr: any) {
        // An authoritative server answer (401/403/404) must never be bypassed by local
        // data, and in real-backend mode the local lists are demo data only.
        const status = apiErr?.status;
        if (!IS_DEMO_MOCK_MODE || status === 401 || status === 403 || status === 404) {
          throw apiErr;
        }
        console.warn('Backend reader data fetch failed, checking local client storage (demo mode):', apiErr);
      }

      // Demo-mode fallback only: check localStorage user uploads and library
      if (IS_DEMO_MOCK_MODE && (!loadedBook || !loadedBook.id)) {
        try {
          const userUploads = JSON.parse(localStorage.getItem('elune_user_uploads') || '[]');
          const myLib = JSON.parse(localStorage.getItem('elune_my_library') || '[]');
          const allLocal = [...userUploads, ...myLib];
          const found = allLocal.find((b: any) => b.id === bookId || b.id?.replace(/\D/g, '') === bookId?.replace(/\D/g, ''));
          if (found) {
            loadedBook = found;
            loadedChapters = found.chapters || [];
          }
        } catch (e) {
          console.warn('Local storage check failed', e);
        }
      }

      if (!loadedBook || !loadedBook.title) {
        throw new Error('Volume not found in library archive.');
      }

      // For scanned / failed / text-less books, DO NOT synthesize a fake chapter
      // from the description. These must fall through to the visual PDF reader so
      // the user sees the actual document, not the upload description.
      const isScannedOrFailed = Boolean(
        loadedBook.isScanned || loadedBook.processingStatus === 'FAILED'
      );

      // Only create a placeholder chapter for genuinely empty (non-scanned) books,
      // so the reader can still render something rather than crashing.
      if ((!loadedChapters || loadedChapters.length === 0) && !isScannedOrFailed) {
        loadedChapters = [
          {
            id: `ch-default-${loadedBook.id}`,
            bookId: loadedBook.id,
            chapterNumber: 1,
            title: loadedBook.title,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            contentBlocks: [
              {
                id: `cb-default-${loadedBook.id}`,
                chapterId: `ch-default-${loadedBook.id}`,
                blockIndex: 1,
                type: 'PARAGRAPH',
                pageNumber: 1,
                text: loadedBook.description || `Welcome to ${loadedBook.title}. Prepared for quiet study in Elunè.`,
                createdAt: new Date().toISOString(),
              }
            ]
          }
        ];
      }

      setBook({ ...loadedBook, chapters: loadedChapters });
      setBookmarks(loadedBookmarks);
      setNotes(loadedNotes);
      setChapters(loadedChapters);

      let targetChapter = loadedChapters[0];
      let targetBlockId = null;
      let targetPage = 1;

      if (progress) {
        if (progress.currentChapterId) {
          const foundChap = loadedChapters.find((c: Chapter) => c.id === progress.currentChapterId);
          if (foundChap) targetChapter = foundChap;
        }
        if (progress.currentContentBlockId) {
          targetBlockId = progress.currentContentBlockId;
        }
        if (progress.currentPage) {
          targetPage = progress.currentPage;
        }
        setProgressPercentage(progress.progressPercentage || 0);
      }

      setCurrentChapter(targetChapter || null);
      setCurrentContentBlockId(targetBlockId);
      setCurrentPage(targetPage);
      // Saved position restored: from now on, real page changes drive progress.
      progressReadyRef.current = true;

      if (targetChapter) {
        await loadChapterAudio(bookId, targetChapter.id);
      }
    } catch (err: any) {
      console.error('Failed to load reader:', err);
      setError(err.message || 'Failed to load reader data');
    } finally {
      setLoading(false);
    }
  };

  // Load Audio & segments for a chapter
  const loadChapterAudio = async (bookId: string, chapterId: string) => {
    try {
      const audioRes = await audioService.getAudioForChapter(bookId, chapterId);
      if (audioRes.success && audioRes.data?.audioTrack) {
        const track = audioRes.data.audioTrack;
        const segments = audioRes.data.segments || [];
        // The track.audioUrl is a virtual placeholder (/audio/stream/...) that has no
        // real audio file behind it. Setting it would make the AudioPlayer show a
        // broken HTML5 audio player instead of the working Web Speech TTS path.
        // Keep segments for paragraph-time mapping, but leave audioUrl null so the
        // browser's speech synthesis is used for narration.
        setAudioUrl(null);
        setAudioSegments(segments);

        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.src = '';
        }
      } else {
        setAudioUrl(null);
        setAudioSegments([]);
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.src = '';
        }
      }
    } catch (e) {
      // Audio might not exist for this chapter yet
      setAudioUrl(null);
      setAudioSegments([]);
    }
  };

  // Chapter Navigation
  const selectChapter = async (chapterId: string) => {
    const chap = chapters.find((c) => c.id === chapterId);
    if (chap && book) {
      setCurrentChapter(chap);
      const firstBlock = chap.contentBlocks?.[0];
      setCurrentContentBlockId(firstBlock?.id || null);
      if (firstBlock?.pageNumber) setCurrentPage(firstBlock.pageNumber);

      // Pause audio and load new chapter audio
      pauseAudio();
      await loadChapterAudio(book.id, chapterId);
    }
  };

  // Jump to paragraph (Reader -> Audio Sync & Navigation with cross-chapter support)
  const jumpToParagraph = async (contentBlockId: string, autoPlayAudio: boolean = false, chapterId?: string) => {
    // 1. Determine target chapter & block
    let targetChapter = currentChapter;
    let targetBlock = currentChapter?.contentBlocks?.find((b) => b.id === contentBlockId);

    if (!targetBlock || (chapterId && chapterId !== currentChapter?.id)) {
      if (chapterId) {
        targetChapter = chapters.find((c) => c.id === chapterId) || targetChapter;
      }
      if (!targetBlock && targetChapter) {
        targetBlock = targetChapter.contentBlocks?.find((b) => b.id === contentBlockId);
      }
      if (!targetBlock) {
        for (const chap of chapters) {
          const found = chap.contentBlocks?.find((b) => b.id === contentBlockId);
          if (found) {
            targetChapter = chap;
            targetBlock = found;
            break;
          }
        }
      }
    }

    // 2. If chapter changed, switch chapter first
    if (targetChapter && targetChapter.id !== currentChapter?.id && book) {
      setCurrentChapter(targetChapter);
      pauseAudio();
      await loadChapterAudio(book.id, targetChapter.id);
    }

    // 3. Set content block & page
    setCurrentContentBlockId(contentBlockId);
    if (targetBlock && targetBlock.pageNumber) {
      setCurrentPage(targetBlock.pageNumber);
    }

    // 4. Find corresponding audio segment
    const segment = audioSegments.find((s) => s.contentBlockId === contentBlockId);
    if (segment && audioElementRef.current) {
      audioElementRef.current.currentTime = segment.startTime;
      setAudioCurrentTime(segment.startTime);
      setActiveAudioSegment(segment);
      if (autoPlayAudio) {
        playAudio();
      }
    }

    // 5. Scroll to element smoothly
    setTimeout(() => {
      const elem = document.getElementById(`content-block-${contentBlockId}`);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Paragraph step controls
  const nextParagraph = () => {
    if (!currentChapter?.contentBlocks || !currentContentBlockId) return;
    const blocks = currentChapter.contentBlocks;
    const currentIndex = blocks.findIndex((b) => b.id === currentContentBlockId);
    if (currentIndex !== -1 && currentIndex < blocks.length - 1) {
      jumpToParagraph(blocks[currentIndex + 1].id, isPlaying);
    }
  };

  const prevParagraph = () => {
    if (!currentChapter?.contentBlocks || !currentContentBlockId) return;
    const blocks = currentChapter.contentBlocks;
    const currentIndex = blocks.findIndex((b) => b.id === currentContentBlockId);
    if (currentIndex > 0) {
      jumpToParagraph(blocks[currentIndex - 1].id, isPlaying);
    }
  };

  // Audio Controls
  const playAudio = () => {
    if (audioElementRef.current && audioUrl) {
      audioElementRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error('Audio play error', e));
    }
  };

  const pauseAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seekAudio = (seconds: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = seconds;
      setAudioCurrentTime(seconds);
    }
  };

  const setSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = speed;
    }
  };

  // PDF page tracking. Updating the page triggers the debounced progress save
  // (percentage is derived from page / totalPages for the single PDF reader).
  const setPdfPage = (page: number, totalPages?: number) => {
    if (totalPages && totalPages > 0) setPdfPageCount(totalPages);
    if (page > 0) setCurrentPage(page);
  };

  const requestPdfPage = (page: number) => {
    if (page > 0) setPageRequest({ page, nonce: Date.now() + Math.random() });
  };

  // Notes and bookmarks must reference an existing content block (DB schema:
  // non-null chapterId/contentBlockId). Pick the block on the nearest page at or
  // before the requested page so the stored pageNumber stays the real PDF page.
  const anchorForPage = (page: number): { chapterId: string; contentBlockId: string } | null => {
    let best: { chapterId: string; contentBlockId: string; pageNumber: number } | null = null;
    let first: { chapterId: string; contentBlockId: string; pageNumber: number } | null = null;
    for (const ch of chapters) {
      for (const b of ch.contentBlocks || []) {
        if (String(b.id).startsWith('cb-default-')) continue; // synthetic placeholder, not in the DB
        const cand = { chapterId: ch.id, contentBlockId: b.id, pageNumber: b.pageNumber || 1 };
        if (!first || cand.pageNumber < first.pageNumber) first = cand;
        if (cand.pageNumber <= page && (!best || cand.pageNumber >= best.pageNumber)) best = cand;
      }
    }
    const pick = best || first;
    return pick ? { chapterId: pick.chapterId, contentBlockId: pick.contentBlockId } : null;
  };
  const canAddNotes = anchorForPage(1) !== null;

  const addPageNote = async (page: number, content: string) => {
    if (!book) throw new Error('No book is open.');
    const anchor = anchorForPage(page);
    if (!anchor) {
      throw new Error('Notes need recognized text in this book. Run text recognition (OCR) from the Summary tab first.');
    }
    const res = await noteService.createNote(book.id, { ...anchor, pageNumber: page, content });
    const created = (res.data as any)?.note ?? res.data;
    if (!res.success || !created?.id) throw new Error('The note was not saved.');
    setNotes((prev) => [created, ...prev]);
  };

  // Page-level bookmarks for the PDF reader. We reuse the existing bookmark API,
  // which requires a chapterId/contentBlockId, by anchoring to the first content
  // block when available and always storing the real PDF pageNumber. The page
  // number is what the reader uses to re-open the bookmark.
  const isPageBookmarked = (page: number) => bookmarks.some((b) => b.pageNumber === page);

  const togglePageBookmark = async (page: number) => {
    if (!book) return;
    const existing = bookmarks.find((b) => b.pageNumber === page);
    if (existing) {
      await bookmarkService.deleteBookmark(existing.id);
      setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
      return;
    }
    const anchor = anchorForPage(page);
    if (!anchor) {
      throw new Error('Bookmarks need recognized text in this book. Run text recognition (OCR) from the Summary tab first.');
    }
    // NOTE: the bookmark API upserts per (user, contentBlock); pages that share an
    // anchor block share one bookmark row (its pageNumber is updated).
    const res = await bookmarkService.createBookmark(book.id, { ...anchor, pageNumber: page, note: `Page ${page}` });
    const created = (res.data as any)?.bookmark ?? res.data;
    if (res.success && created?.id) {
      setBookmarks((prev) => [...prev.filter((b) => b.id !== created.id), created]);
    }
  };

  // Bookmarks
  const isBookmarked = (contentBlockId: string) => {
    return bookmarks.some((b) => b.contentBlockId === contentBlockId);
  };

  const getBookmark = (contentBlockId: string) => {
    return bookmarks.find((b) => b.contentBlockId === contentBlockId);
  };

  const toggleBookmark = async (contentBlockId: string, pageNumber: number, noteText?: string) => {
    if (!book || !currentChapter) return;
    const existing = bookmarks.find((b) => b.contentBlockId === contentBlockId);

    if (existing) {
      await bookmarkService.deleteBookmark(existing.id);
      setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
    } else {
      const res = await bookmarkService.createBookmark(book.id, {
        chapterId: currentChapter.id,
        contentBlockId,
        pageNumber,
        note: noteText,
      });
      if (res.success && res.data?.bookmark) {
        setBookmarks((prev) => [...prev, res.data.bookmark]);
      }
    }
  };

  // Notes
  const getNote = (contentBlockId: string) => {
    return notes.find((n) => n.contentBlockId === contentBlockId);
  };

  const saveNote = async (contentBlockId: string, pageNumber: number, content: string) => {
    if (!book || !currentChapter) return;
    const existing = notes.find((n) => n.contentBlockId === contentBlockId);

    if (existing) {
      const res = await noteService.updateNote(existing.id, content);
      const updated = (res.data as any)?.note ?? res.data;
      if (res.success && updated?.id) {
        setNotes((prev) => prev.map((n) => (n.id === existing.id ? updated : n)));
      }
    } else {
      const res = await noteService.createNote(book.id, {
        chapterId: currentChapter.id,
        contentBlockId,
        pageNumber,
        content,
      });
      const created = (res.data as any)?.note ?? res.data;
      if (res.success && created?.id) {
        setNotes((prev) => [...prev, created]);
      }
    }
  };

  const deleteNote = async (noteId: string) => {
    await noteService.deleteNote(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  return (
    <ReaderContext.Provider
      value={{
        book,
        chapters,
        currentChapter,
        currentContentBlockId,
        currentPage,
        progressPercentage,
        loading,
        error,

        bookmarks,
        notes,
        isBookmarked,
        getBookmark,
        getNote,
        toggleBookmark,
        saveNote,
        deleteNote,

        audioUrl,
        audioDuration,
        audioCurrentTime,
        isPlaying,
        playbackSpeed,
        audioSegments,
        activeAudioSegment,
        playAudio,
        pauseAudio,
        seekAudio,
        setSpeed,
        jumpToParagraph,
        nextParagraph,
        prevParagraph,

        setPdfPage,
        requestPdfPage,
        pageRequest,
        addPageNote,
        canAddNotes,
        isPageBookmarked,
        togglePageBookmark,
        summaryText,
        setSummaryText,

        selectChapter,
        loadBook,
      }}
    >
      {children}
    </ReaderContext.Provider>
  );
};

export const useReader = () => {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error('useReader must be used within a ReaderProvider');
  }
  return context;
};

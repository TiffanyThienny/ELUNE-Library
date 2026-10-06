import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Book, Chapter, ContentBlock, AudioSegment, Bookmark, Note } from '../types';
import { readerService, bookmarkService, noteService, audioService } from '../services/api';

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

  // Debounced Save Reading Progress
  const debouncedSaveProgress = useCallback(
    (bId: string, chapId: string, blkId: string | null, page: number, totalPgs: number) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const percentage = Math.min(100, Math.round((page / (totalPgs || 1)) * 100));
          setProgressPercentage(percentage);
          await readerService.saveProgress(bId, {
            chapterId: chapId,
            contentBlockId: blkId || undefined,
            pageNumber: page,
            progressPercentage: percentage,
          });
        } catch (e) {
          console.error('Failed to save progress', e);
        }
      }, 3500); // 3.5s debounce
    },
    []
  );

  // Trigger debounced save progress on contentBlockId/page changes
  useEffect(() => {
    if (book && currentChapter) {
      debouncedSaveProgress(
        book.id,
        currentChapter.id,
        currentContentBlockId,
        currentPage,
        book.totalPages
      );
    }
  }, [book, currentChapter, currentContentBlockId, currentPage, debouncedSaveProgress]);

  // Load Book reader data
  const loadBook = async (bookId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await readerService.getReaderData(bookId);
      if (res.success && res.data) {
        const loadedBook = res.data.book || res.data;
        const chaps = loadedBook.chapters || res.data.chapters || [];
        setBook({ ...loadedBook, chapters: chaps });
        setBookmarks(res.data.bookmarks || res.data.userBookmarks || []);
        setNotes(res.data.notes || res.data.userNotes || []);
        setChapters(chaps);

        // Resume reading position
        const progress = res.data.readingProgress;
        let targetChapter = chaps[0];
        let targetBlockId = null;
        let targetPage = 1;

        if (progress) {
          if (progress.currentChapterId) {
            const foundChap = chaps.find((c: Chapter) => c.id === progress.currentChapterId);
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

        // Load Audio for targetChapter
        if (targetChapter) {
          await loadChapterAudio(bookId, targetChapter.id);
        }
      }
    } catch (err: any) {
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
        setAudioUrl(track.audioUrl);
        setAudioSegments(segments);

        if (audioElementRef.current) {
          audioElementRef.current.src = track.audioUrl;
          audioElementRef.current.playbackRate = playbackSpeed;
          audioElementRef.current.load();
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
      if (res.success && res.data?.note) {
        setNotes((prev) => prev.map((n) => (n.id === existing.id ? res.data.note : n)));
      }
    } else {
      const res = await noteService.createNote(book.id, {
        chapterId: currentChapter.id,
        contentBlockId,
        pageNumber,
        content,
      });
      if (res.success && res.data?.note) {
        setNotes((prev) => [...prev, res.data.note]);
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

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useReader } from '../context/ReaderContext';
import { LoadingState } from '../components/LoadingState';
import { AudioPlayer } from '../components/AudioPlayer';
import { BookmarkButton } from '../components/BookmarkButton';
import { NoteButton } from '../components/NoteButton';
import { NotePanel } from '../components/NotePanel';
import { SummaryPanel } from '../components/SummaryPanel';
import { AIChat } from '../components/AIChat';
import { ProgressBar } from '../components/ProgressBar';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  FileText,
  BookOpen,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';

export const ReaderPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams] = useSearchParams();

  const {
    book,
    chapters,
    currentChapter,
    currentContentBlockId,
    currentPage,
    progressPercentage,
    loading,
    error,
    loadBook,
    selectChapter,
    jumpToParagraph,
    isBookmarked,
    getNote,
  } = useReader();

  const [activeTab, setActiveTab] = useState<'notes' | 'summary' | 'chat'>('chat');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xl'>('normal');

  // Load book data
  useEffect(() => {
    if (bookId) {
      loadBook(bookId);
    }
  }, [bookId]);

  // Handle URL query parameters (jumping from bookmark/note)
  useEffect(() => {
    const targetChapterId = searchParams.get('chapterId');
    const targetBlockId = searchParams.get('contentBlockId');

    if (targetChapterId && currentChapter && targetChapterId !== currentChapter.id) {
      selectChapter(targetChapterId);
    }

    if (targetBlockId) {
      setTimeout(() => {
        jumpToParagraph(targetBlockId);
      }, 500);
    }
  }, [searchParams, currentChapter]);



  if (loading) {
    return <LoadingState message="Opening book in comfortable reader sanctuary..." fullPage />;
  }

  if (error || !book) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="font-serif-literata text-2xl font-bold text-[#2C2421] mb-2">
          Unable to Open Reader
        </h2>
        <p className="text-xs text-[#665A4F] mb-6">{error || 'Book content could not be retrieved.'}</p>
        <Link
          to="/library"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2C2421] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Link>
      </div>
    );
  }

  const currentChapterIndex = chapters.findIndex((c) => c.id === currentChapter?.id);
  const hasPrevChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex !== -1 && currentChapterIndex < chapters.length - 1;

  const fontClass = {
    normal: 'text-base sm:text-lg leading-relaxed',
    large: 'text-lg sm:text-xl leading-loose',
    xl: 'text-xl sm:text-2xl leading-loose',
  }[fontSize];

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      {/* Reader Sub-Header */}
      <header className="bg-white border-b border-[#E8DFD3] sticky top-16 z-30 px-4 py-2.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={`/book/${book.id}`}
              className="p-1.5 text-[#8C7355] hover:text-[#2C2421] hover:bg-[#FAF7F2] rounded-xl transition-colors"
              title="Return to Book Overview"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h2 className="font-serif-literata font-bold text-sm text-[#2C2421] line-clamp-1">
                {book.title}
              </h2>
              <span className="text-[11px] text-[#8C7355] font-medium">
                {currentChapter ? `Chapter ${currentChapter.chapterNumber}: ${currentChapter.title}` : 'Prologue'}
              </span>
            </div>
          </div>

          {/* Reader Preferences & Chapter shortcuts */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('summary')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E8DFD3] hover:bg-[#FAF7F2] text-[#2C2421] text-xs font-semibold transition-colors shadow-2xs"
              title="Open Chapter Summary"
            >
              <FileText className="w-3.5 h-3.5 text-[#8C7355]" />
              <span className="hidden sm:inline">Summary</span>
            </button>

            {/* Font size picker */}
            <div className="flex items-center bg-[#FAF7F2] border border-[#E8DFD3] rounded-xl p-0.5 text-xs font-bold text-[#8C7355]">
              <button
                onClick={() => setFontSize('normal')}
                className={`px-2 py-1 rounded-lg transition-colors ${fontSize === 'normal' ? 'bg-[#2C2421] text-white' : 'hover:text-[#2C2421]'}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-2 py-1 rounded-lg transition-colors text-sm ${fontSize === 'large' ? 'bg-[#2C2421] text-white' : 'hover:text-[#2C2421]'}`}
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('xl')}
                className={`px-2 py-1 rounded-lg transition-colors text-base ${fontSize === 'xl' ? 'bg-[#2C2421] text-white' : 'hover:text-[#2C2421]'}`}
              >
                A++
              </button>
            </div>

            <div className="hidden md:block w-32" title={`Reading Progress: ${Math.round(progressPercentage)}% completed`}>
              <ProgressBar progress={progressPercentage} label="Progress" showPercent />
            </div>
          </div>
        </div>
      </header>

      {/* Main Two-Column Reader Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* LEFT / MAIN READING CANVAS */}
        <main className="flex-1 flex flex-col justify-between">
          <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 sm:p-12 shadow-xs min-h-[600px] flex flex-col justify-between">
            {/* Chapter Header */}
            <div>
              <div className="text-center pb-8 border-b border-[#F2ECE1] mb-8">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#8C7355] font-bold">
                  Chapter {currentChapter?.chapterNumber || 1} • Page {currentPage}
                </span>
                <h1 className="font-serif-literata text-2xl sm:text-3xl font-bold text-[#2C2421] mt-2">
                  {currentChapter?.title || 'Untitled Chapter'}
                </h1>
              </div>

              {/* Paragraphs / Content Blocks */}
              <div className="space-y-6">
                {currentChapter?.contentBlocks && currentChapter.contentBlocks.length > 0 ? (
                  currentChapter.contentBlocks.map((block) => {
                    const bookmarked = isBookmarked(block.id);
                    const note = getNote(block.id);

                    return (
                      <div
                        key={block.id}
                        id={`content-block-${block.id}`}
                        onClick={() => jumpToParagraph(block.id, false)}
                        className={`group relative transition-all duration-200 ${
                          bookmarked
                            ? 'bg-[#F4EBD9]/80 border-l-4 border-[#8C7355] rounded-2xl p-4 shadow-xs my-3'
                            : 'p-2 rounded-xl my-1 hover:bg-[#FAF7F2]/60'
                        }`}
                      >
                        {/* Hover Annotation Bar (Bookmark + Note) */}
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs border border-[#E8DFD3] rounded-xl p-0.5 shadow-xs flex items-center gap-1 z-10">
                          <BookmarkButton
                            contentBlockId={block.id}
                            pageNumber={block.pageNumber || currentPage}
                          />
                          <NoteButton
                            contentBlockId={block.id}
                            pageNumber={block.pageNumber || currentPage}
                          />
                        </div>

                        {/* Indicators for existing bookmark/note */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {bookmarked && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8C7355] bg-[#EBDDC8] px-2 py-0.5 rounded-full">
                              <Bookmark className="w-2.5 h-2.5 fill-current" /> Bookmarked
                            </span>
                          )}
                          {note && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-700 bg-stone-200 px-2 py-0.5 rounded-full">
                              <FileText className="w-2.5 h-2.5" /> Note
                            </span>
                          )}
                        </div>

                        {/* Paragraph Text */}
                        <p className={`font-serif-literata text-[#2C2421] text-justify ${fontClass}`}>
                          {block.text}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center space-y-3 bg-[#FAF7F2] rounded-2xl p-6 border border-[#E8DFD3]">
                    <FileText className="w-8 h-8 text-[#8C7355] mx-auto opacity-70" />
                    <h3 className="text-sm font-bold text-[#2C2421]">
                      This PDF could not be converted into readable text.
                    </h3>
                    <p className="text-xs text-[#665A4F] max-w-md mx-auto leading-relaxed">
                      This may happen with scanned or image-only PDFs without digital text streams.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Chapter Navigation Footer */}
            <div className="mt-12 pt-6 border-t border-[#F2ECE1] flex items-center justify-between text-xs">
              <button
                disabled={!hasPrevChapter}
                onClick={() => selectChapter(chapters[currentChapterIndex - 1].id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-[#2C2421] font-semibold disabled:opacity-30 hover:bg-[#F2ECE1] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Chapter
              </button>

              <span className="text-[11px] font-mono text-[#8C7355]">
                {currentChapterIndex + 1} / {chapters.length}
              </span>

              <button
                disabled={!hasNextChapter}
                onClick={() => selectChapter(chapters[currentChapterIndex + 1].id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-[#2C2421] font-semibold disabled:opacity-30 hover:bg-[#F2ECE1] transition-colors"
              >
                Next Chapter <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        {/* RIGHT / STUDY & AUDIO COMPANION SIDEBAR */}
        <aside className="w-full lg:w-96 flex flex-col gap-5">
          {/* Synchronized Audio Player */}
          <AudioPlayer />

          {/* AI & Annotation Companion Container */}
          <div className="bg-white border border-[#E8DFD3] rounded-3xl p-4 shadow-xs space-y-4">
            {/* Tool Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[#FAF7F2] border border-[#E8DFD3] p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab('chat')}
                title="Reading Companion Q&A"
                className={`py-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                  activeTab === 'chat'
                    ? 'bg-[#2C2421] text-white shadow-2xs'
                    : 'text-[#8C7355] hover:text-[#2C2421]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-[10px]">Q&A</span>
              </button>

              <button
                onClick={() => setActiveTab('summary')}
                title="Chapter Summary"
                className={`py-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                  activeTab === 'summary'
                    ? 'bg-[#2C2421] text-white shadow-2xs'
                    : 'text-[#8C7355] hover:text-[#2C2421]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[10px]">Summary</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                title="Paragraph Annotations"
                className={`py-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                  activeTab === 'notes'
                    ? 'bg-[#2C2421] text-white shadow-2xs'
                    : 'text-[#8C7355] hover:text-[#2C2421]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="text-[10px]">Notes</span>
              </button>
            </div>

            {/* Tab Body */}
            <div>
              {activeTab === 'chat' && <AIChat />}

              {activeTab === 'summary' && <SummaryPanel />}

              {activeTab === 'notes' && <NotePanel />}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

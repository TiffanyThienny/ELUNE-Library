import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useReader } from '../context/ReaderContext';
import { LoadingState } from '../components/LoadingState';
import { AudioPlayer } from '../components/AudioPlayer';
import { NotePanel } from '../components/NotePanel';
import { SummaryPanel } from '../components/SummaryPanel';
import { AIChat } from '../components/AIChat';
import { ProgressBar } from '../components/ProgressBar';
import { PdfVisualReader } from '../components/PdfVisualReader';
import {
  Bookmark as BookmarkIcon,
  FileText,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';

export const ReaderPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams] = useSearchParams();

  const {
    book,
    currentPage,
    progressPercentage,
    loading,
    error,
    loadBook,
    setPdfPage,
    togglePageBookmark,
    isPageBookmarked,
  } = useReader();

  const [activeTab, setActiveTab] = useState<'notes' | 'summary' | 'chat'>('summary');

  // Load book data
  useEffect(() => {
    if (bookId) {
      loadBook(bookId);
    }
  }, [bookId]);

  // Jump to a specific page when opened from a bookmark (?page=N)
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '', 10);
    if (!isNaN(page) && page > 0) {
      setPdfPage(page);
    }
  }, [searchParams]);

  if (loading || book?.processingStatus === 'PROCESSING') {
    return (
      <LoadingState
        message={
          book?.processingStatus === 'PROCESSING'
            ? 'Preparing your book... Setting up your distraction-free reading sanctuary.'
            : 'Opening book in comfortable reader sanctuary...'
        }
        fullPage
      />
    );
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

  const pageBookmarked = isPageBookmarked(currentPage);

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
                {`Page ${currentPage} of ${book.totalPages}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bookmark the current PDF page */}
            <button
              onClick={() => togglePageBookmark(currentPage)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors shadow-2xs ${
                pageBookmarked
                  ? 'bg-[#2C2421] text-white border-[#2C2421]'
                  : 'bg-white border-[#E8DFD3] hover:bg-[#FAF7F2] text-[#2C2421]'
              }`}
              title={pageBookmarked ? 'Remove bookmark on this page' : 'Bookmark this page'}
            >
              <BookmarkIcon className={`w-3.5 h-3.5 ${pageBookmarked ? 'fill-current' : 'text-[#8C7355]'}`} />
              <span className="hidden sm:inline">{pageBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>

            <div className="hidden md:block w-32" title={`Reading Progress: ${Math.round(progressPercentage)}% completed`}>
              <ProgressBar progress={progressPercentage} label="Progress" showPercent />
            </div>
          </div>
        </div>
      </header>

      {/* Main Two-Column Reader Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* LEFT / MAIN PDF READING CANVAS */}
        <main className="flex-1 flex flex-col">
          <div className="bg-white border border-[#E8DFD3] rounded-3xl p-4 sm:p-6 shadow-xs min-h-[600px]">
            <PdfVisualReader
              bookId={book.id}
              fileUrl={book.fileUrl}
              totalPages={book.totalPages}
              initialPage={currentPage}
              onPageChange={setPdfPage}
            />
          </div>
        </main>

        {/* RIGHT / STUDY & AUDIO COMPANION SIDEBAR */}
        <aside className="w-full lg:w-96 flex flex-col gap-5">
          {/* Summary audio narration */}
          <AudioPlayer />

          {/* AI & Annotation Companion Container */}
          <div className="bg-white border border-[#E8DFD3] rounded-3xl p-4 shadow-xs space-y-4">
            {/* Tool Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[#FAF7F2] border border-[#E8DFD3] p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab('summary')}
                title="AI Summary of this book"
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
                onClick={() => setActiveTab('chat')}
                title="Ask about this book"
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
                onClick={() => setActiveTab('notes')}
                title="Notes for this book"
                className={`py-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                  activeTab === 'notes'
                    ? 'bg-[#2C2421] text-white shadow-2xs'
                    : 'text-[#8C7355] hover:text-[#2C2421]'
                }`}
              >
                <BookmarkIcon className="w-3.5 h-3.5" />
                <span className="text-[10px]">Notes</span>
              </button>
            </div>

            {/* Tab Body */}
            <div>
              {activeTab === 'summary' && <SummaryPanel />}
              {activeTab === 'chat' && <AIChat />}
              {activeTab === 'notes' && <NotePanel />}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

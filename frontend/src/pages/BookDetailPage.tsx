import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Book, Summary } from '../types';
import { bookService, libraryService, aiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/LoadingState';
import { Toast, ToastType } from '../components/Toast';
import {
  BookOpen,
  BookmarkPlus,
  BookmarkCheck,
  Sparkles,
  Lock,
  Globe,
  Clock,
  ArrowLeft,
  Share2,
} from 'lucide-react';

export const BookDetailPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inLibrary, setInLibrary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    bookService
      .getById(bookId)
      .then((res) => {
        if (res.success && res.data?.book) {
          setBook(res.data.book);
        }
      })
      .catch((err) => {
        setError(err.message || 'Unable to access book details');
      })
      .finally(() => setLoading(false));

    // Check if in library
    if (isAuthenticated) {
      libraryService
        .getMyLibrary()
        .then((res) => {
          if (res.success && res.data?.library) {
            const found = res.data.library.some((b: Book) => b.id === bookId);
            setInLibrary(found);
          }
        })
        .catch(() => {});
    }
  }, [bookId, isAuthenticated]);

  const handleToggleLibrary = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!book) return;

    try {
      if (inLibrary) {
        await libraryService.removeFromLibrary(book.id);
        setInLibrary(false);
        setToast({ message: 'Removed from your library', type: 'info' });
      } else {
        await libraryService.addToLibrary(book.id);
        setInLibrary(true);
        setToast({ message: 'Saved to your library', type: 'success' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Operation failed', type: 'error' });
    }
  };

  const handleSummarize = async () => {
    if (!book) return;
    setSummaryLoading(true);
    try {
      const res = await aiService.summarizeBook(book.id);
      if (res.success && res.data?.summary) {
        setSummary(res.data.summary.content);
        setToast({ message: 'AI synthesis complete', type: 'success' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to synthesize book', type: 'error' });
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Fetching book details..." fullPage />;
  }

  if (error || !book) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="font-serif-literata text-2xl font-bold text-[#2C2421] mb-2">
          Access Restricted
        </h2>
        <p className="text-sm text-[#665A4F] mb-6">
          {error || 'This book does not exist or is marked private by its curator.'}
        </p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2C2421] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Back button */}
      <div>
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C7355] hover:text-[#2C2421] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Link>
      </div>

      {/* Main Book Detail Banner */}
      <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 sm:p-10 shadow-xs flex flex-col md:flex-row gap-8 items-start">
        {/* Cover */}
        <div className="w-full sm:w-64 aspect-[3/4] shrink-0 rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#E8DFD3] shadow-xs">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#EBDDC8] to-[#D9C8B4] p-6 flex flex-col justify-end text-[#2C2421]">
              <span className="text-xs uppercase tracking-widest text-[#8C7355] font-bold">
                {book.category?.name || 'Literary'}
              </span>
              <h2 className="font-serif-literata font-bold text-xl leading-snug mt-1">
                {book.title}
              </h2>
              <p className="text-xs text-[#665A4F] mt-1 font-medium">{book.author}</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {book.visibility === 'PRIVATE' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-stone-900 text-white">
                  <Lock className="w-3 h-3" /> Private
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-900 text-white">
                  <Globe className="w-3 h-3" /> Public
                </span>
              )}

              {book.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white">
                  <Clock className="w-3 h-3" /> Pending Review
                </span>
              )}
            </div>

            <h1 className="font-serif-literata text-3xl sm:text-4xl font-bold text-[#2C2421] leading-tight">
              {book.title}
            </h1>
            <p className="text-base font-medium text-[#665A4F]">by {book.author}</p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-[#8C7355] border-y border-[#F2ECE1] py-3">
            <div>
              <span className="font-bold text-[#2C2421]">Category:</span>{' '}
              {book.category?.name || 'General'}
            </div>
            <div>
              <span className="font-bold text-[#2C2421]">Pages:</span> {book.totalPages}
            </div>
            <div>
              <span className="font-bold text-[#2C2421]">Language:</span> {book.language}
            </div>
            <div>
              <span className="font-bold text-[#2C2421]">Format:</span>{' '}
              {book.fileType?.toUpperCase() || 'CANONICAL'}
            </div>
          </div>

          {book.description && (
            <p className="text-xs sm:text-sm text-[#665A4F] leading-relaxed">
              {book.description}
            </p>
          )}

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to={`/read/${book.id}`}
              className="px-6 py-3 rounded-2xl bg-[#2C2421] hover:bg-[#433832] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Open in Reader
            </Link>

            <button
              onClick={handleToggleLibrary}
              className={`px-5 py-3 rounded-2xl border text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                inLibrary
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-[#E8DFD3] bg-white hover:bg-[#FAF7F2] text-[#2C2421]'
              }`}
            >
              {inLibrary ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                  In My Library
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4 text-[#8C7355]" />
                  Add to Library
                </>
              )}
            </button>

            <button
              onClick={handleSummarize}
              disabled={summaryLoading}
              className="px-5 py-3 rounded-2xl border border-[#E8DFD3] bg-white hover:bg-[#FAF7F2] text-[#2C2421] text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#8C7355]" />
              {summaryLoading ? 'Generating AI Summary...' : 'AI Summary'}
            </button>
          </div>
        </div>
      </div>

      {/* AI Summary Section if generated */}
      {summary && (
        <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 sm:p-8 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#8C7355] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Executive Synthesis
          </div>
          <div className="font-serif-literata text-xs sm:text-sm text-[#2C2421] leading-relaxed whitespace-pre-line">
            {summary}
          </div>
        </div>
      )}

      {/* Chapters Preview */}
      {book.chapters && book.chapters.length > 0 && (
        <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif-literata text-lg font-bold text-[#2C2421]">Table of Contents</h3>
          <div className="divide-y divide-[#F2ECE1]">
            {book.chapters.map((chap) => (
              <div
                key={chap.id}
                className="py-3 flex items-center justify-between hover:bg-[#FAF7F2] px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#FAF7F2] border border-[#E8DFD3] text-xs font-mono font-bold text-[#8C7355] flex items-center justify-center">
                    {chap.chapterNumber}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#2C2421]">
                    {chap.title}
                  </span>
                </div>
                <Link
                  to={`/read/${book.id}`}
                  className="text-xs font-semibold text-[#8C7355] hover:text-[#2C2421]"
                >
                  Read →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

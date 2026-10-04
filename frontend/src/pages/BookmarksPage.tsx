import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookmarkService } from '../services/api';
import { Bookmark } from '../types';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { Bookmark as BookmarkIcon, BookOpen, Trash2, ArrowUpRight } from 'lucide-react';

export const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    bookmarkService
      .getAllBookmarks()
      .then((res) => {
        if (res.success && res.data?.bookmarks) {
          setBookmarks(res.data.bookmarks);
        }
      })
      .catch((err) => console.error('Failed to load bookmarks', err))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await bookmarkService.deleteBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Failed to delete bookmark', err);
    }
  };

  const handleOpenBookmark = (bookmark: Bookmark) => {
    // Navigate to reader with target query parameters so reader scrolls to contentBlockId and seeks audio
    navigate(`/read/${bookmark.bookId}?chapterId=${bookmark.chapterId}&contentBlockId=${bookmark.contentBlockId}&page=${bookmark.pageNumber}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E8DFD3] pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-1">
          <BookmarkIcon className="w-3.5 h-3.5" />
          Paragraph Bookmarks
        </div>
        <h1 className="font-serif-literata text-3xl font-bold text-[#2C2421]">
          Saved Bookmarks
        </h1>
        <p className="text-xs sm:text-sm text-[#665A4F] mt-1">
          Direct coordinates to individual paragraphs, synced with reader view and audio segments.
        </p>
      </div>

      {loading ? (
        <LoadingState message="Retrieving bookmarks..." />
      ) : bookmarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookmarks.map((bm) => (
            <div
              key={bm.id}
              onClick={() => handleOpenBookmark(bm)}
              className="group cursor-pointer bg-white border border-[#E8DFD3] hover:border-[#8C7355] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif-literata font-bold text-base text-[#2C2421] group-hover:text-[#8C7355] transition-colors line-clamp-1">
                      {bm.book?.title || 'Book Title'}
                    </h3>
                    <p className="text-xs text-[#665A4F]">
                      {bm.chapter?.title ? `Chapter ${bm.chapter.chapterNumber}: ${bm.chapter.title}` : 'Chapter Passage'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-[#8C7355] bg-[#FAF7F2] border border-[#E8DFD3] px-2 py-0.5 rounded-lg shrink-0">
                    Page {bm.pageNumber}
                  </span>
                </div>

                {bm.contentBlock?.text && (
                  <p className="font-serif-literata text-xs text-[#2C2421] line-clamp-3 italic bg-[#FAF7F2] p-3 rounded-xl border border-[#F2ECE1]">
                    "{bm.contentBlock.text}"
                  </p>
                )}

                {bm.note && (
                  <p className="text-xs text-[#8C7355] font-medium">
                    <span className="font-bold text-[#2C2421]">Note:</span> {bm.note}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#F2ECE1] flex items-center justify-between text-xs">
                <span className="text-[10px] text-[#A69888]">
                  Saved {new Date(bm.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(bm.id, e)}
                    className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                    title="Delete bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#2C2421] group-hover:text-[#8C7355]">
                    Open Reader <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="You haven't saved any bookmarks yet."
          subtitle="While reading, click the bookmark icon on any paragraph to save your exact position."
          actionText="Browse Library"
          actionOnClick={() => navigate('/explore')}
          icon={<BookmarkIcon className="w-7 h-7" />}
        />
      )}
    </div>
  );
};

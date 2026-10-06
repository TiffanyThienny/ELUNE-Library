import React, { useState, useEffect, useMemo } from 'react';
import { Book } from '../types';
import { libraryService, bookService } from '../services/api';
import { BookCard } from '../components/BookCard';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import {
  BookOpen,
  UploadCloud,
  Library as LibraryIcon,
  Search,
  ArrowUpDown,
  Grid,
  List,
  Lock,
  Globe,
  Clock,
  CheckCircle2,
  X,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type TabType = 'all' | 'private' | 'uploads' | 'saved';
type SortType = 'newest' | 'title-asc' | 'title-desc' | 'author-asc' | 'pages-desc' | 'pages-asc';
type StatusFilter = 'all' | 'private' | 'pending' | 'approved';
type ViewMode = 'grid' | 'list';

export const PersonalLibraryPage: React.FC = () => {
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [uploadedBooks, setUploadedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search Controls
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [libRes, uploadRes] = await Promise.all([
          libraryService.getMyLibrary(),
          bookService.getMyUploads(),
        ]);

        if (libRes.success && libRes.data?.library) {
          setLibraryBooks(libRes.data.library);
        }
        if (uploadRes.success && uploadRes.data?.books) {
          setUploadedBooks(uploadRes.data.books);
        }
      } catch (err) {
        console.error('Failed to load library items', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Merge unique books across saved library and user uploads
  const combinedBooks = useMemo(() => {
    const map = new Map<string, Book>();
    // Priority to uploadedBooks so user status (PENDING/PRIVATE) is accurate
    uploadedBooks.forEach((b) => map.set(b.id, b));
    libraryBooks.forEach((b) => {
      if (!map.has(b.id)) {
        map.set(b.id, b);
      }
    });
    return Array.from(map.values());
  }, [libraryBooks, uploadedBooks]);

  // Metrics for structured top stats bar
  const metrics = useMemo(() => {
    const total = combinedBooks.length;
    const privateCount = combinedBooks.filter((b) => b.visibility === 'PRIVATE').length;
    const pendingCount = combinedBooks.filter((b) => b.status === 'PENDING').length;
    const approvedCount = combinedBooks.filter((b) => b.status === 'APPROVED' && b.visibility === 'PUBLIC').length;
    return { total, privateCount, pendingCount, approvedCount };
  }, [combinedBooks]);

  // Tab counts
  const privateBooks = useMemo(
    () => combinedBooks.filter((b) => b.visibility === 'PRIVATE'),
    [combinedBooks]
  );

  // Filtered and sorted books
  const processedBooks = useMemo(() => {
    // 1. Tab filter
    let list: Book[] = [];
    if (activeTab === 'all') {
      list = [...combinedBooks];
    } else if (activeTab === 'private') {
      list = [...privateBooks];
    } else if (activeTab === 'uploads') {
      list = [...uploadedBooks];
    } else if (activeTab === 'saved') {
      list = [...libraryBooks];
    }

    // 2. Status filter
    if (statusFilter === 'private') {
      list = list.filter((b) => b.visibility === 'PRIVATE');
    } else if (statusFilter === 'pending') {
      list = list.filter((b) => b.status === 'PENDING');
    } else if (statusFilter === 'approved') {
      list = list.filter((b) => b.status === 'APPROVED');
    }

    // 3. Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.category?.name && b.category.name.toLowerCase().includes(q)) ||
          (b.description && b.description.toLowerCase().includes(q))
      );
    }

    // 4. Sort
    list.sort((a, b) => {
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      if (sortBy === 'title-desc') return b.title.localeCompare(a.title);
      if (sortBy === 'author-asc') return a.author.localeCompare(b.author);
      if (sortBy === 'pages-desc') return (b.totalPages || 0) - (a.totalPages || 0);
      if (sortBy === 'pages-asc') return (a.totalPages || 0) - (b.totalPages || 0);
      // default: newest first
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [combinedBooks, privateBooks, uploadedBooks, libraryBooks, activeTab, statusFilter, searchQuery, sortBy]);

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E8DFD3] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-2">
            <LibraryIcon className="w-3.5 h-3.5" />
            Curated Archives
          </div>
          <h1 className="font-serif-literata text-3xl sm:text-4xl font-bold text-[#2C2421]">
            My Library
          </h1>
          <p className="text-xs sm:text-sm text-[#665A4F] mt-1 max-w-xl leading-relaxed">
            Manage your personal reading collection. Personal uploads are available immediately, while public uploads await editorial approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold shadow-2xs transition-all hover:shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            Upload New Book
          </Link>
        </div>
      </div>

      {/* Structured Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#E8DFD3] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7355] block">
            Total Volumes
          </span>
          <span className="font-serif-literata text-2xl font-bold text-[#2C2421] mt-1 block">
            {metrics.total}
          </span>
          <span className="text-[11px] text-[#A69888] mt-0.5 block">In your personal archives</span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 text-white border border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-300 block">
              Private (Self)
            </span>
            <Lock className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <span className="font-serif-literata text-2xl font-bold text-white mt-1 block">
            {metrics.privateCount}
          </span>
          <span className="text-[11px] text-emerald-400 font-medium mt-0.5 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready to read instantly
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8DFD3] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7355] block">
              Pending Admin
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="font-serif-literata text-2xl font-bold text-[#2C2421] mt-1 block">
            {metrics.pendingCount}
          </span>
          <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">
            Awaiting public review
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8DFD3] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7355] block">
              Published
            </span>
            <Globe className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <span className="font-serif-literata text-2xl font-bold text-[#2C2421] mt-1 block">
            {metrics.approvedCount}
          </span>
          <span className="text-[11px] text-stone-500 mt-0.5 block">Visible to all readers</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E8DFD3] gap-2 sm:gap-6 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            setActiveTab('all');
            setStatusFilter('all');
          }}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors relative whitespace-nowrap cursor-pointer ${
            activeTab === 'all'
              ? 'text-[#2C2421]'
              : 'text-[#8C7355] hover:text-[#2C2421]'
          }`}
        >
          All Volumes ({combinedBooks.length})
          {activeTab === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8C7355]" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('private');
            setStatusFilter('all');
          }}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'private'
              ? 'text-[#2C2421]'
              : 'text-[#8C7355] hover:text-[#2C2421]'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-[#8C7355]" />
          Personal & Private ({privateBooks.length})
          {activeTab === 'private' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8C7355]" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('uploads');
            setStatusFilter('all');
          }}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'uploads'
              ? 'text-[#2C2421]'
              : 'text-[#8C7355] hover:text-[#2C2421]'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5 text-[#8C7355]" />
          My Uploads ({uploadedBooks.length})
          {activeTab === 'uploads' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8C7355]" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('saved');
            setStatusFilter('all');
          }}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors relative whitespace-nowrap cursor-pointer ${
            activeTab === 'saved'
              ? 'text-[#2C2421]'
              : 'text-[#8C7355] hover:text-[#2C2421]'
          }`}
        >
          Saved from Explore ({libraryBooks.length})
          {activeTab === 'saved' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8C7355]" />
          )}
        </button>
      </div>

      {/* Structured Search & Sort Control Toolbar */}
      <div className="bg-white border border-[#E8DFD3] rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8C7355] absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your library by title, author, or keywords..."
            className="w-full pl-10 pr-9 py-2 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421] placeholder-[#A69888] focus:outline-hidden focus:border-[#8C7355] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-[#A69888] hover:text-[#2C2421] cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Status Filter (shown if in 'all' or 'uploads') */}
          {(activeTab === 'all' || activeTab === 'uploads') && (
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C7355] shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421] focus:outline-hidden focus:border-[#8C7355] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="private">Private (Instant Read)</option>
                <option value="pending">Waiting Admin Approval</option>
                <option value="approved">Published / Approved</option>
              </select>
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#8C7355] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="px-3 py-2 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421] focus:outline-hidden focus:border-[#8C7355] cursor-pointer"
            >
              <option value="newest">Recently Added</option>
              <option value="title-asc">Title (A → Z)</option>
              <option value="title-desc">Title (Z → A)</option>
              <option value="author-asc">Author (A → Z)</option>
              <option value="pages-desc">Pages (High to Low)</option>
              <option value="pages-asc">Pages (Low to High)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-[#E8DFD3] rounded-xl overflow-hidden bg-[#FAF7F2] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#2C2421] shadow-2xs font-bold'
                  : 'text-[#8C7355] hover:text-[#2C2421]'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#2C2421] shadow-2xs font-bold'
                  : 'text-[#8C7355] hover:text-[#2C2421]'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-xs text-[#665A4F] flex-wrap">
          <span className="font-semibold text-[#8C7355]">Active filters:</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EBDDC8]/60 text-[#2C2421]">
              Query: "{searchQuery}"
              <button onClick={() => setSearchQuery('')} className="hover:text-red-700">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EBDDC8]/60 text-[#2C2421]">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter('all')} className="hover:text-red-700">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {sortBy !== 'newest' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EBDDC8]/60 text-[#2C2421]">
              Sort: {sortBy}
              <button onClick={() => setSortBy('newest')} className="hover:text-red-700">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={resetFilters}
            className="text-[11px] underline text-[#8C7355] hover:text-[#2C2421] ml-2 cursor-pointer"
          >
            Reset all filters
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <LoadingState message="Accessing your personal archives..." />
      ) : processedBooks.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {processedBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                showStatus={true}
              />
            ))}
          </div>
        ) : (
          /* Structured Table / List View */
          <div className="bg-white border border-[#E8DFD3] rounded-3xl overflow-hidden shadow-xs divide-y divide-[#F2ECE1]">
            {processedBooks.map((book) => {
              const isPrivate = book.visibility === 'PRIVATE';
              const isPending = book.status === 'PENDING';
              const isApproved = book.status === 'APPROVED';

              return (
                <div
                  key={book.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF7F2]/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Thumbnail Cover */}
                    <Link
                      to={`/book/${book.id}`}
                      className="w-12 h-16 shrink-0 rounded-xl overflow-hidden bg-[#FAF7F2] border border-[#E8DFD3] shadow-2xs"
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#EBDDC8] to-[#D9C8B4] p-1.5 flex flex-col justify-end text-[8px] font-bold text-[#2C2421]">
                          <span className="line-clamp-2 leading-tight">{book.title}</span>
                        </div>
                      )}
                    </Link>

                    {/* Book Metadata */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isPrivate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-900 text-white">
                            <Lock className="w-2.5 h-2.5" /> Private (Self)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-900 text-white">
                            <Globe className="w-2.5 h-2.5" /> Public
                          </span>
                        )}

                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white">
                            <Clock className="w-2.5 h-2.5" /> Waiting for admin approval
                          </span>
                        )}

                        {isApproved && !isPrivate && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Published
                          </span>
                        )}

                        <span className="text-[11px] text-[#8C7355] font-medium">
                          {book.category?.name || 'Literary'} • {book.totalPages} pages
                        </span>
                      </div>

                      <Link to={`/book/${book.id}`}>
                        <h3 className="font-serif-literata font-bold text-base text-[#2C2421] truncate hover:text-[#8C7355] transition-colors">
                          {book.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-[#665A4F] truncate">by {book.author}</p>
                    </div>
                  </div>

                  {/* Quick Action CTAs */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <Link
                      to={`/book/${book.id}`}
                      className="px-3.5 py-1.5 rounded-xl border border-[#E8DFD3] text-xs font-semibold text-[#665A4F] hover:text-[#2C2421] hover:bg-white transition-colors"
                    >
                      Details
                    </Link>

                    <Link
                      to={`/read/${book.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#2C2421] text-white text-xs font-semibold hover:bg-[#433832] transition-colors shadow-2xs"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      {isPending ? 'Preview' : 'Read'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : hasActiveFilters ? (
        <EmptyState
          title="No volumes found matching your filters."
          subtitle={`We couldn't find any books matching "${searchQuery || statusFilter}". Try adjusting your search query or reset your filters.`}
          actionText="Clear Filters"
          actionOnClick={resetFilters}
        />
      ) : activeTab === 'private' ? (
        <EmptyState
          title="No personal private uploads yet."
          subtitle="Upload your private documents, papers, or manuscripts. They will be stored securely and ready to read and listen immediately."
          actionText="Upload a Private Book"
          actionOnClick={() => (window.location.href = '/upload')}
          icon={<Lock className="w-7 h-7" />}
        />
      ) : activeTab === 'uploads' ? (
        <EmptyState
          title="You haven't uploaded any books yet."
          subtitle="Upload your private documents or share literature with the community. Private uploads are immediately available for reading."
          actionText="Upload a Volume"
          actionOnClick={() => (window.location.href = '/upload')}
          icon={<UploadCloud className="w-7 h-7" />}
        />
      ) : (
        <EmptyState
          title="Your library is waiting for its first volume."
          subtitle="Browse our public explore catalog or upload your own PDF/EPUB to start reading with AI summarization and audio."
          actionText="Explore Library"
          actionOnClick={() => (window.location.href = '/explore')}
          icon={<Sparkles className="w-7 h-7" />}
        />
      )}
    </div>
  );
};

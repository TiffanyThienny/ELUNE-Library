import React, { useState, useEffect } from 'react';
import { Book, Category } from '../types';
import { bookService, categoryService } from '../services/api';
import { BookGrid } from '../components/BookGrid';
import { LoadingState } from '../components/LoadingState';
import { Search, BookOpen, AlertCircle, RotateCcw, X } from 'lucide-react';

export const ExplorePage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination((p) => ({ ...p, page: 1 }));
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Load categories from database
  useEffect(() => {
    categoryService
      .getAll()
      .then((res) => {
        if (res.success && res.data?.categories) {
          setCategories(res.data.categories);
        }
      })
      .catch((e) => console.error('Failed to load categories', e));
  }, []);

  // Fetch approved public books
  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookService.getExplore({
        search: debouncedSearch || undefined,
        categoryId: selectedCategory || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res.success && res.data) {
        setBooks(res.data.books);
        setPagination(res.data.pagination);
      } else {
        setError('Unable to load books. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to fetch books', err);
      setError('Unable to load books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [debouncedSearch, selectedCategory, pagination.page]);

  const isFiltering = Boolean(debouncedSearch || selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E8DFD3] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            Public Collection
          </div>
          <h1 className="font-serif-literata text-3xl sm:text-4xl font-bold text-[#2C2421]">
            Explore Books
          </h1>
          <p className="text-xs sm:text-sm text-[#665A4F] mt-1 max-w-xl">
            Discover books and find something new to read.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#8C7355] absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-[#E8DFD3] bg-white text-xs text-[#2C2421] placeholder-[#A69888] focus:outline-hidden focus:border-[#8C7355] shadow-2xs transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-[#A69888] hover:text-[#2C2421] cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Categories Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => {
            setSelectedCategory('');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === ''
              ? 'bg-[#2C2421] text-white shadow-2xs'
              : 'bg-white border border-[#E8DFD3] text-[#665A4F] hover:bg-[#F2ECE1]'
          }`}
        >
          All Categories
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-[#2C2421] text-white shadow-2xs'
                : 'bg-white border border-[#E8DFD3] text-[#665A4F] hover:bg-[#F2ECE1]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid Content / Error / Loading States */}
      {loading ? (
        <LoadingState message="Loading books..." />
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-red-200 bg-red-50/50 my-6 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-serif-literata text-base font-bold text-red-900 mb-1">
            {error}
          </h3>
          <p className="text-xs text-red-700 mb-4">
            Could not retrieve the book catalog from the server.
          </p>
          <button
            onClick={() => fetchBooks()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2C2421] text-white text-xs font-semibold hover:bg-[#433832] transition-colors cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      ) : (
        <BookGrid
          books={books}
          emptyTitle={isFiltering ? 'No books found.' : 'No books available yet.'}
          emptySubtitle={
            isFiltering
              ? 'No books matched your search or category filter. Try different keywords or select All Categories.'
              : 'There are currently no public approved books in the library. Check back soon!'
          }
        />
      )}

      {/* Pagination */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-white border border-[#E8DFD3] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-[#FAF7F2] transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-[#8C7355] font-semibold px-2">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-white border border-[#E8DFD3] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-[#FAF7F2] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

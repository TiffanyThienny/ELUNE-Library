import React, { useState, useEffect } from 'react';
import { Book, Category } from '../types';
import { bookService, categoryService } from '../services/api';
import { BookGrid } from '../components/BookGrid';
import { LoadingState } from '../components/LoadingState';
import { Search, Filter, BookOpen } from 'lucide-react';

export const ExplorePage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Load categories
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

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const res = await bookService.getExplore({
          search: debouncedSearch,
          categoryId: selectedCategory || undefined,
          page: pagination.page,
          limit: pagination.limit,
        });

        if (res.success && res.data) {
          setBooks(res.data.books);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch books', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [debouncedSearch, selectedCategory, pagination.page]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8DFD3] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            Curated Public Library
          </div>
          <h1 className="font-serif-literata text-3xl sm:text-4xl font-bold text-[#2C2421]">
            Explore Literature
          </h1>
          <p className="text-xs sm:text-sm text-[#665A4F] mt-1 max-w-xl">
            Browse through peer-reviewed and verified public books, philosophy treatises, and intellectual texts.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#8C7355] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#E8DFD3] bg-white text-xs text-[#2C2421] focus:outline-hidden focus:border-[#8C7355] shadow-2xs"
          />
        </div>
      </div>

      {/* Categories chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => {
            setSelectedCategory('');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#2C2421] text-white shadow-2xs'
                : 'bg-white border border-[#E8DFD3] text-[#665A4F] hover:bg-[#F2ECE1]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid Content */}
      {loading ? (
        <LoadingState message="Discovering literature..." />
      ) : (
        <BookGrid
          books={books}
          emptyTitle="No literature found"
          emptySubtitle="No approved public books match your search criteria. Try adjusting your query or category filter."
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-white border border-[#E8DFD3] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-[#8C7355] font-semibold px-2">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-white border border-[#E8DFD3] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

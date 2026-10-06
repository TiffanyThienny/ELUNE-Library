import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { Book } from '../../types';
import { AdminSidebar } from '../../components/Sidebar';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { BookOpen, Lock, Globe, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminBooksPage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getAllBooks()
      .then((res) => {
        if (res.success && res.data?.books) {
          setBooks(res.data.books);
        }
      })
      .catch((err) => console.error('Failed to load all books', err))
      .finally(() => setLoading(false));
  }, []);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleToggleVisibility = async (bookId: string) => {
    setActionLoading(bookId);
    try {
      const res = await adminService.toggleVisibility(bookId);
      if (res.success && res.data?.book) {
        setBooks((prev) =>
          prev.map((b) => (b.id === bookId ? { ...b, ...res.data.book } : b))
        );
      }
    } catch (err) {
      console.error('Failed to toggle visibility', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#FAF7F2]">
      <AdminSidebar />

      <main className="flex-1 p-6 sm:p-10 space-y-8 max-w-6xl">
        <div className="border-b border-[#E8DFD3] pb-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-1">
              Catalog Management
            </div>
            <h1 className="font-serif-literata text-3xl font-bold text-[#2C2421]">
              All System Books
            </h1>
            <p className="text-xs sm:text-sm text-[#665A4F] mt-1">
              Full inventory across all user accounts, public catalogs, and private collections.
            </p>
          </div>
          <span className="text-xs font-bold font-mono px-3 py-1.5 bg-white border border-[#E8DFD3] rounded-xl text-[#8C7355]">
            Total: {books.length} Volumes
          </span>
        </div>

        {loading ? (
          <LoadingState message="Indexing books..." />
        ) : books.length > 0 ? (
          <div className="bg-white border border-[#E8DFD3] rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E8DFD3] text-[#8C7355] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Uploader</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Visibility</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE1]">
                  {books.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                      <td className="py-3.5 px-4 font-serif-literata font-bold text-[#2C2421]">
                        {b.title}
                      </td>
                      <td className="py-3.5 px-4 text-[#665A4F]">{b.author}</td>
                      <td className="py-3.5 px-4 text-[#8C7355]">
                        {b.uploader?.name || 'Unknown'}
                      </td>
                      <td className="py-3.5 px-4 text-[#665A4F]">
                        {b.category?.name || 'General'}
                      </td>
                      <td className="py-3.5 px-4">
                        {b.visibility === 'PRIVATE' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" /> Private
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Globe className="w-2.5 h-2.5" /> Public
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            b.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleVisibility(b.id)}
                          disabled={actionLoading === b.id}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                            b.visibility === 'PUBLIC' && b.status === 'APPROVED'
                              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {actionLoading === b.id
                            ? '...'
                            : b.visibility === 'PUBLIC' && b.status === 'APPROVED'
                            ? 'Set Private'
                            : 'Publish to Public'}
                        </button>
                        <Link
                          to={`/book/${b.id}`}
                          className="font-semibold text-[#8C7355] hover:text-[#2C2421]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState title="No books in system" />
        )}
      </main>
    </div>
  );
};

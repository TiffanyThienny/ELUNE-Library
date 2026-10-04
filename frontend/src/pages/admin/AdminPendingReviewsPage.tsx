import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { Book } from '../../types';
import { AdminSidebar } from '../../components/Sidebar';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { Toast, ToastType } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import {
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  User,
  Tag,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const AdminPendingReviewsPage: React.FC = () => {
  const [pendingBooks, setPendingBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await adminService.getPendingBooks();
      if (res.success && res.data?.pendingBooks) {
        setPendingBooks(res.data.pendingBooks);
      }
    } catch (err) {
      console.error('Failed to load pending books', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (book: Book) => {
    setActionLoading(true);
    try {
      const res = await adminService.reviewBook(book.id, { action: 'APPROVE' });
      if (res.success) {
        setToast({ message: `"${book.title}" approved for the public library.`, type: 'success' });
        setPendingBooks((prev) => prev.filter((b) => b.id !== book.id));
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Approval failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (book: Book) => {
    setSelectedBook(book);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !rejectionReason.trim()) return;

    setActionLoading(true);
    try {
      const res = await adminService.reviewBook(selectedBook.id, {
        action: 'REJECT',
        rejectionReason: rejectionReason.trim(),
      });

      if (res.success) {
        setToast({ message: `"${selectedBook.title}" was rejected.`, type: 'info' });
        setPendingBooks((prev) => prev.filter((b) => b.id !== selectedBook.id));
        setRejectModalOpen(false);
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Rejection failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#FAF7F2]">
      <AdminSidebar />

      <main className="flex-1 p-6 sm:p-10 space-y-8 max-w-6xl">
        {/* Header */}
        <div className="border-b border-[#E8DFD3] pb-6">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            <Clock className="w-3.5 h-3.5" />
            Editorial Queue
          </div>
          <h1 className="font-serif-literata text-3xl font-bold text-[#2C2421]">
            Pending Public Book Reviews
          </h1>
          <p className="text-xs sm:text-sm text-[#665A4F] mt-1">
            Carefully review community submissions before publishing them to the public explore catalog.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState message="Loading editorial submissions..." />
        ) : pendingBooks.length > 0 ? (
          <div className="space-y-6">
            {pendingBooks.map((book) => (
              <div
                key={book.id}
                className="bg-white border border-[#E8DFD3] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row gap-6 items-start"
              >
                {/* Cover Preview */}
                <div className="w-full sm:w-44 aspect-[3/4] shrink-0 rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#E8DFD3]">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#EBDDC8] to-[#D9C8B4] p-4 flex flex-col justify-end text-[#2C2421]">
                      <span className="text-[10px] font-bold text-[#8C7355] uppercase">
                        {book.category?.name || 'General'}
                      </span>
                      <h4 className="font-serif-literata font-bold text-sm line-clamp-2 mt-0.5">
                        {book.title}
                      </h4>
                      <p className="text-xs text-[#665A4F] line-clamp-1">{book.author}</p>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        PENDING EDITORIAL APPROVAL
                      </span>
                      <span className="text-xs text-[#8C7355] font-mono">
                        {book.totalPages} Pages
                      </span>
                    </div>

                    <h2 className="font-serif-literata text-2xl font-bold text-[#2C2421]">
                      {book.title}
                    </h2>
                    <p className="text-sm font-medium text-[#665A4F]">by {book.author}</p>
                  </div>

                  {book.description && (
                    <p className="text-xs text-[#665A4F] leading-relaxed bg-[#FAF7F2] p-3 rounded-xl border border-[#F2ECE1]">
                      {book.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-[#8C7355]">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Uploader: {book.uploader?.name || 'Community Member'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Category: {book.category?.name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Submitted: {new Date(book.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={() => handleApprove(book)}
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve for Public
                    </button>

                    <button
                      onClick={() => handleOpenReject(book)}
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl border border-red-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Book
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No books waiting for review."
            subtitle="All community submissions have been reviewed and processed."
            icon={<CheckCircle2 className="w-7 h-7 text-emerald-600" />}
          />
        )}

        {/* Rejection Modal with reason */}
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title={`Reject Submission: ${selectedBook?.title || ''}`}
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C2421] mb-1.5">
                Rejection Reason *
              </label>
              <textarea
                required
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain to the uploader why this volume cannot be approved for public distribution (e.g. copyright concerns, poor formatting, incomplete chapters)..."
                className="w-full p-3 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421] focus:outline-hidden focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#665A4F] hover:bg-[#F2ECE1]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </main>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/api';
import { Category } from '../../types';
import { AdminSidebar } from '../../components/Sidebar';
import { LoadingState } from '../../components/LoadingState';
import { Toast, ToastType } from '../../components/Toast';
import { Tag, Plus, BookOpen } from 'lucide-react';

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // New category form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await categoryService.getAll();
      if (res.success && res.data?.categories) {
        setCategories(res.data.categories);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await categoryService.create(name.trim(), description.trim());
      if (res.success && res.data?.category) {
        setCategories((prev) => [...prev, res.data.category]);
        setName('');
        setDescription('');
        setToast({ message: `Category "${res.data.category.name}" created.`, type: 'success' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to create category', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#FAF7F2]">
      <AdminSidebar />

      <main className="flex-1 p-6 sm:p-10 space-y-8 max-w-6xl">
        <div className="border-b border-[#E8DFD3] pb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-1">
            Taxonomy Architecture
          </div>
          <h1 className="font-serif-literata text-3xl font-bold text-[#2C2421]">
            Genre & Subject Categories
          </h1>
          <p className="text-xs sm:text-sm text-[#665A4F] mt-1">
            Organize volumes into distinct domains of intellectual inquiry.
          </p>
        </div>

        {/* Add Category Form */}
        <form
          onSubmit={handleCreate}
          className="bg-white border border-[#E8DFD3] rounded-3xl p-6 shadow-xs space-y-4"
        >
          <h3 className="font-serif-literata font-bold text-base text-[#2C2421] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#8C7355]" /> Create New Category
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C2421] mb-1">Category Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Epistemology, Stoicism"
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C2421] mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional scope or domain description"
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="px-5 py-2 bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {creating ? 'Saving...' : 'Add Category'}
            </button>
          </div>
        </form>

        {/* Category List */}
        {loading ? (
          <LoadingState message="Indexing categories..." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-[#E8DFD3] rounded-2xl p-5 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#8C7355]" />
                    <h4 className="font-serif-literata font-bold text-base text-[#2C2421]">
                      {c.name}
                    </h4>
                  </div>
                  {c._count && (
                    <span className="text-[10px] font-mono text-[#8C7355] bg-[#FAF7F2] border border-[#E8DFD3] px-2 py-0.5 rounded-full">
                      {c._count.books} Books
                    </span>
                  )}
                </div>
                {c.description && (
                  <p className="text-xs text-[#665A4F] leading-relaxed">{c.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

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

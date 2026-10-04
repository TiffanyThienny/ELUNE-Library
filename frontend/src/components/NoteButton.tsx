import React, { useState } from 'react';
import { FileEdit, MessageSquare } from 'lucide-react';
import { useReader } from '../context/ReaderContext';

interface NoteButtonProps {
  contentBlockId: string;
  pageNumber: number;
}

export const NoteButton: React.FC<NoteButtonProps> = ({
  contentBlockId,
  pageNumber,
}) => {
  const { getNote, saveNote, deleteNote } = useReader();
  const existingNote = getNote(contentBlockId);
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState(existingNote?.content || '');
  const [saving, setSaving] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContent(existingNote?.content || '');
    setIsOpen(!isOpen);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await saveNote(contentBlockId, pageNumber, content.trim());
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to save note', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!existingNote) return;
    setSaving(true);
    try {
      await deleteNote(existingNote.id);
      setContent('');
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to delete note', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleOpen}
        title={existingNote ? 'View/Edit paragraph note' : 'Add note to this paragraph'}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          existingNote
            ? 'bg-[#2C2421] text-white shadow-xs'
            : 'text-[#8C7355] hover:bg-[#EBDDC8] hover:text-[#2C2421]'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-[#E8DFD3] rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 text-left"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F2ECE1]">
            <span className="text-xs font-semibold text-[#2C2421] flex items-center gap-1.5">
              <FileEdit className="w-3.5 h-3.5 text-[#8C7355]" />
              {existingNote ? 'Edit Note' : 'Add Paragraph Note'}
            </span>
            <span className="text-[10px] text-[#A69888]">Page {pageNumber}</span>
          </div>

          <form onSubmit={handleSave}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Jot down personal thoughts or quotes..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-[#2C2421] focus:outline-hidden focus:border-[#8C7355] focus:ring-1 focus:ring-[#8C7355] resize-none"
              autoFocus
            />

            <div className="mt-2.5 flex items-center justify-between">
              {existingNote ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-[11px] text-red-600 hover:text-red-700 font-medium transition-colors"
                >
                  Delete
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 text-xs text-[#665A4F] hover:bg-[#F2ECE1] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !content.trim()}
                  className="px-3 py-1 bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

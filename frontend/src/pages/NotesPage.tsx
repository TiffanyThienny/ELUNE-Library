import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { noteService } from '../services/api';
import { Note } from '../types';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { FileText, Trash2, ArrowUpRight, BookOpen } from 'lucide-react';

export const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    noteService
      .getAllNotes()
      .then((res) => {
        if (res.success && res.data?.notes) {
          setNotes(res.data.notes);
        }
      })
      .catch((err) => console.error('Failed to load notes', err))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await noteService.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  };

  const handleOpenNote = (note: Note) => {
    navigate(
      `/read/${note.bookId}?chapterId=${note.chapterId}&contentBlockId=${note.contentBlockId}&page=${note.pageNumber}`
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E8DFD3] pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-1">
          <FileText className="w-3.5 h-3.5" />
          Annotation Ledger
        </div>
        <h1 className="font-serif-literata text-3xl font-bold text-[#2C2421]">
          Reading Notes
        </h1>
        <p className="text-xs sm:text-sm text-[#665A4F] mt-1">
          Your personal thoughts and margin annotations anchored to specific paragraphs.
        </p>
      </div>

      {loading ? (
        <LoadingState message="Retrieving notes..." />
      ) : notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleOpenNote(note)}
              className="group cursor-pointer bg-white border border-[#E8DFD3] hover:border-[#8C7355] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif-literata font-bold text-base text-[#2C2421] group-hover:text-[#8C7355] transition-colors line-clamp-1">
                      {note.book?.title || 'Book Title'}
                    </h3>
                    <p className="text-xs text-[#665A4F]">
                      {note.chapter?.title ? `Chapter ${note.chapter.chapterNumber}: ${note.chapter.title}` : 'Passage'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-[#8C7355] bg-[#FAF7F2] border border-[#E8DFD3] px-2 py-0.5 rounded-lg shrink-0">
                    Page {note.pageNumber}
                  </span>
                </div>

                {/* Personal Note Content */}
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#F2ECE1]">
                  <p className="text-xs text-[#2C2421] font-medium whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                </div>

                {/* Paragraph anchor preview */}
                {note.contentBlock?.text && (
                  <p className="text-[11px] text-[#8C7355] line-clamp-2 italic">
                    Referencing: "{note.contentBlock.text}"
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#F2ECE1] flex items-center justify-between text-xs">
                <span className="text-[10px] text-[#A69888]">
                  Annotated {new Date(note.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(note.id, e)}
                    className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#2C2421] group-hover:text-[#8C7355]">
                    Open Paragraph <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your reading notes will appear here."
          subtitle="Whenever inspiration strikes while reading, add an annotation to any paragraph."
          actionText="Explore Library"
          actionOnClick={() => navigate('/explore')}
          icon={<FileText className="w-7 h-7" />}
        />
      )}
    </div>
  );
};

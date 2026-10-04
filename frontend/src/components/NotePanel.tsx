import React from 'react';
import { useReader } from '../context/ReaderContext';
import { FileText, Trash2, ArrowUpRight } from 'lucide-react';
import { EmptyState } from './EmptyState';

export const NotePanel: React.FC = () => {
  const { notes, jumpToParagraph, deleteNote } = useReader();

  if (notes.length === 0) {
    return (
      <EmptyState
        title="No notes yet"
        subtitle="Hover over any paragraph in the reader and click the note icon to record your reflections."
        icon={<FileText className="w-6 h-6" />}
      />
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div
          key={note.id}
          className="p-3.5 bg-white border border-[#E8DFD3] rounded-2xl shadow-2xs hover:border-[#8C7355] transition-all"
        >
          <div className="flex items-center justify-between text-[11px] text-[#8C7355] font-medium mb-1.5">
            <span>Page {note.pageNumber}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => jumpToParagraph(note.contentBlockId)}
                className="flex items-center gap-0.5 text-[#2C2421] hover:text-[#8C7355] font-semibold"
              >
                Jump <ArrowUpRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => deleteNote(note.id)}
                className="text-stone-400 hover:text-red-600 transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-[#2C2421] font-medium whitespace-pre-wrap leading-relaxed">
            {note.content}
          </p>
          <div className="mt-2 text-[10px] text-[#A69888]">
            {new Date(note.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

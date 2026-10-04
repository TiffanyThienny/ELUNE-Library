import React, { useState } from 'react';
import { Modal } from './Modal';
import { MindMapNode } from '../types';
import { Network, ChevronRight, ChevronDown, Sparkles } from 'lucide-react';

interface MindMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  mindmap: MindMapNode | null;
  loading: boolean;
  bookTitle?: string;
}

const MindMapTreeNode: React.FC<{ node: MindMapNode; level?: number }> = ({ node, level = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const bgColors = [
    'bg-[#2C2421] text-white',
    'bg-[#8C7355] text-white',
    'bg-[#EBDDC8] text-[#2C2421] border border-[#D9C8B4]',
    'bg-white text-[#2C2421] border border-[#E8DFD3]',
  ];

  return (
    <div className="flex flex-col ml-4 sm:ml-6 mt-3 border-l-2 border-[#D9C8B4] pl-3">
      <div className="flex items-center gap-2">
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-[#8C7355] hover:text-[#2C2421] rounded transition-colors"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-4 h-4 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8C7355]" />
          </div>
        )}

        <div
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs ${
            bgColors[Math.min(level, bgColors.length - 1)]
          }`}
        >
          {node.title}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="flex flex-col space-y-1">
          {node.children!.map((child, idx) => (
            <MindMapTreeNode key={idx} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const MindMapModal: React.FC<MindMapModalProps> = ({
  isOpen,
  onClose,
  mindmap,
  loading,
  bookTitle,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bookTitle ? `Conceptual Mind Map: ${bookTitle}` : 'Conceptual Mind Map'}
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#E8DFD3] border-t-[#8C7355] animate-spin" />
          <p className="text-xs font-medium text-[#665A4F]">Constructing semantic knowledge tree...</p>
        </div>
      ) : mindmap ? (
        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFD3] overflow-x-auto min-h-[350px]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#8C7355] mb-2 uppercase tracking-wider">
            <Network className="w-4 h-4" />
            Knowledge Architecture
          </div>
          <MindMapTreeNode node={mindmap} level={0} />
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-[#8C7355]">
          No mind map generated yet.
        </div>
      )}
    </Modal>
  );
};

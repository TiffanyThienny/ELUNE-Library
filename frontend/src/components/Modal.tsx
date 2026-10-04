import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} bg-[#FAF7F2] border border-[#E8DFD3] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8DFD3] flex items-center justify-between bg-white">
          <h3 className="font-serif-literata font-bold text-lg text-[#2C2421]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-[#2C2421] hover:bg-[#F2ECE1] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

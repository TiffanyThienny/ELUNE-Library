import React from 'react';
import { BookOpen } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  actionOnClick?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  actionText,
  actionOnClick,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-[#E8DFD3] bg-[#FAF7F2]/50 my-6">
      <div className="w-14 h-14 rounded-2xl bg-[#F2ECE1] text-[#8C7355] flex items-center justify-center mb-4 shadow-2xs">
        {icon || <BookOpen className="w-7 h-7" />}
      </div>
      <h3 className="font-serif-literata text-lg font-bold text-[#2C2421] mb-1">{title}</h3>
      {subtitle && (
        <p className="text-sm text-[#665A4F] max-w-md mx-auto mb-5 leading-relaxed">{subtitle}</p>
      )}
      {actionText && actionOnClick && (
        <button
          onClick={actionOnClick}
          className="px-5 py-2.5 rounded-xl bg-[#2C2421] text-white text-sm font-medium hover:bg-[#433832] transition-colors shadow-2xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

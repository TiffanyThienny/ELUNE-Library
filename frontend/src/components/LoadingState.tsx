import React from 'react';

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading literature...',
  fullPage = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="relative w-12 h-12">
        <div className="w-12 h-12 rounded-full border-2 border-[#E8DFD3] border-t-[#8C7355] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center font-serif-literata font-bold text-xs text-[#8C7355]">
          É
        </div>
      </div>
      <p className="text-sm font-medium text-[#665A4F] animate-pulse">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

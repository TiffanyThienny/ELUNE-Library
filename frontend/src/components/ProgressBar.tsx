import React from 'react';

interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercent?: boolean;
  className?: string;
  colorClass?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercent = true,
  className = '',
  colorClass = 'bg-[#8C7355]',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center text-xs text-[#665A4F] mb-1.5 font-medium">
          {label && <span>{label}</span>}
          {showPercent && <span>{clamped}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-[#E8DFD3] rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

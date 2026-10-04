import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    error: <AlertCircle className="w-4 h-4 text-red-600" />,
    info: <Info className="w-4 h-4 text-stone-600" />,
  };

  const bgStyles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    error: 'bg-red-50 border-red-200 text-red-950',
    info: 'bg-white border-[#E8DFD3] text-[#2C2421]',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg ${bgStyles[type]} max-w-sm`}
      >
        {icons[type]}
        <span className="text-xs font-medium flex-1">{message}</span>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

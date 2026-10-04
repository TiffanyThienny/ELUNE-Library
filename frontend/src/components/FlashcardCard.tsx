import React, { useState } from 'react';
import { Flashcard } from '../types';
import { RotateCw, CheckCircle, BrainCircuit } from 'lucide-react';

interface FlashcardCardProps {
  flashcard: Flashcard;
  index: number;
  total: number;
}

export const FlashcardCard: React.FC<FlashcardCardProps> = ({
  flashcard,
  index,
  total,
}) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      onClick={() => setFlipped(!flipped)}
      className="cursor-pointer group relative min-h-[220px] w-full rounded-2xl border border-[#E8DFD3] bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between text-xs text-[#8C7355] font-semibold border-b border-[#F2ECE1] pb-2">
        <span className="flex items-center gap-1.5">
          <BrainCircuit className="w-3.5 h-3.5" />
          Card {index + 1} of {total}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#A69888] group-hover:text-[#2C2421] transition-colors">
          <RotateCw className="w-3 h-3" />
          Click to Flip
        </span>
      </div>

      <div className="my-auto py-4 text-center">
        {!flipped ? (
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#8C7355] block mb-2">
              Question
            </span>
            <p className="font-serif-literata font-bold text-base text-[#2C2421] leading-relaxed">
              {flashcard.question}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 block mb-2">
              Answer & Insight
            </span>
            <p className="text-sm font-medium text-[#2C2421] leading-relaxed">
              {flashcard.answer}
            </p>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-[#A69888]">
        {flipped ? 'Showing Answer' : 'Showing Question'}
      </div>
    </div>
  );
};

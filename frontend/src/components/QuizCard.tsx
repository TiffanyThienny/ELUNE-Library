import React, { useState } from 'react';
import { Quiz } from '../types';
import { CheckCircle2, XCircle, HelpCircle, Info } from 'lucide-react';

interface QuizCardProps {
  quiz: Quiz;
  index: number;
}

export const QuizCard: React.FC<QuizCardProps> = ({ quiz, index }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Normalize options array
  const rawOptions = quiz.options;
  let optionsList: string[] = [];
  if (Array.isArray(rawOptions)) {
    optionsList = rawOptions.map((opt) => (typeof opt === 'string' ? opt : JSON.stringify(opt)));
  } else if (typeof rawOptions === 'object' && rawOptions !== null) {
    optionsList = Object.values(rawOptions).map(String);
  }

  const handleSelect = (option: string) => {
    if (submitted) return;
    setSelectedOption(option);
  };

  const isCorrect = selectedOption?.trim().toLowerCase() === quiz.correctAnswer.trim().toLowerCase();

  return (
    <div className="bg-white border border-[#E8DFD3] rounded-2xl p-5 shadow-xs transition-all space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#F2ECE1]">
        <span className="text-xs font-bold text-[#8C7355] flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          Question {index + 1}
        </span>
        {submitted && (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-3 h-3" /> Correct
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" /> Incorrect
              </>
            )}
          </span>
        )}
      </div>

      {/* Question */}
      <p className="font-serif-literata font-bold text-sm text-[#2C2421] leading-relaxed">
        {quiz.question}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {optionsList.map((opt, i) => {
          let style = 'bg-[#FAF7F2] border-[#E8DFD3] text-[#2C2421] hover:bg-[#F2ECE1]';

          if (submitted) {
            if (opt.trim().toLowerCase() === quiz.correctAnswer.trim().toLowerCase()) {
              style = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold';
            } else if (selectedOption === opt) {
              style = 'bg-red-50 border-red-400 text-red-900 line-through';
            } else {
              style = 'opacity-50 border-[#E8DFD3]';
            }
          } else if (selectedOption === opt) {
            style = 'bg-[#EBDDC8] border-[#8C7355] text-[#2C2421] font-semibold';
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(opt)}
              disabled={submitted}
              className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${style}`}
            >
              <span className="w-5 h-5 rounded-full bg-white/80 border border-[#D9C8B4] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 leading-normal">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Action / Explanation */}
      {!submitted ? (
        <div className="pt-2 flex justify-end">
          <button
            onClick={() => setSubmitted(true)}
            disabled={!selectedOption}
            className="px-4 py-2 bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-40"
          >
            Submit Answer
          </button>
        </div>
      ) : (
        quiz.explanation && (
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-bold">Explanation:</span> {quiz.explanation}
            </p>
          </div>
        )
      )}
    </div>
  );
};

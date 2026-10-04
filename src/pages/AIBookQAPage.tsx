import React, { useState } from 'react';
import { Sparkles, Send, ArrowLeft, User } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { api } from '../services/api';

export const AIBookQAPage: React.FC = () => {
  const { activeBook, navigateTo } = useLibrary();
  const book = activeBook;

  const [inputQuery, setInputQuery] = useState<string>('');
  const [messages, setMessages] = useState<{ id: string; sender: 'user' | 'ai'; text: string }[]>([
    {
      id: 'm-1',
      sender: 'ai',
      text: `Welcome! I am your quiet reading companion for "${book.title}". You can ask me any question about the concepts, chapter breakdowns, or practical applications of this book.`
    }
  ]);

  const presetQuestions = [
    'What is the main idea of this book?',
    'Explain Chapter 1 simply.',
    'What are the most important concepts?',
    'Give me a practical example from the book.'
  ];

  const handleSendQuestion = async (questionText: string) => {
    if (!questionText.trim()) return;

    const userMsg = { id: `m-${Date.now()}`, sender: 'user' as const, text: questionText };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');

    // Fallback answer generator
    const getFallbackAnswer = () => {
      const matchedPreset = book.presetQAs.find(q => 
        q.question.toLowerCase().includes(questionText.toLowerCase().slice(0, 10))
      );
      return matchedPreset 
        ? matchedPreset.answer 
        : `In "${book.title}", ${book.author} explores this exact theme: when we focus our internal energy on reason and self-mastery, external challenges transform into material for wisdom.`;
    };

    try {
      const res = await api.askBookQuestion(book.id, questionText);
      const aiReplyText = (res && res.success && res.data?.answer) ? res.data.answer : getFallbackAnswer();
      setMessages(prev => [
        ...prev, 
        { id: `m-${Date.now() + 1}`, sender: 'ai', text: aiReplyText }
      ]);
    } catch {
      setMessages(prev => [
        ...prev, 
        { id: `m-${Date.now() + 1}`, sender: 'ai', text: getFallbackAnswer() }
      ]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6 flex flex-col h-[calc(100vh-6rem)] animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#E8DACD] pb-4 shrink-0">
        <button
          onClick={() => navigateTo('book-detail', book.id)}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#8C7B73] hover:text-[#2C2421] transition-smooth cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to {book.title}</span>
        </button>

        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#8C7355]" />
          <span className="font-serif font-semibold text-sm text-[#2C2421]">
            AI Book Companion
          </span>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="space-y-2 shrink-0">
        <span className="text-[11px] font-semibold uppercase text-[#8C7B73] tracking-wider">
          Suggested Questions
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuestion(q)}
              className="px-3.5 py-1.5 rounded-full bg-[#FAF0E6] border border-[#E8DACD] text-xs text-[#5E504A] hover:bg-[#F7E7CE] hover:text-[#2C2421] transition-smooth shrink-0 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-3xl bg-[#FAF0E6] border border-[#E8DACD] pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.sender === 'user' ? 'bg-[#8C7355] text-[#FFF8E7]' : 'bg-[#CDB891] text-[#2C2421]'
            }`}>
              {msg.sender === 'user' ? <User size={16} /> : <Sparkles size={16} />}
            </div>

            <div className={`max-w-lg p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
              msg.sender === 'user' 
                ? 'bg-[#2C2421] text-[#FFF8E7]' 
                : 'bg-[#FFF8E7] text-[#2C2421] border border-[#E8DACD] font-serif shadow-xs'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <div className="flex items-center gap-3 bg-[#FAF0E6] p-3 rounded-2xl border border-[#E8DACD] shrink-0">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendQuestion(inputQuery)}
          placeholder="Ask a question about concepts in this book..."
          className="flex-1 bg-[#FFF8E7] text-[#2C2421] placeholder-[#8C7B73] text-xs sm:text-sm rounded-xl px-4 py-3 border border-[#E8DACD] focus:outline-none focus:border-[#CDB891]"
        />
        <button
          onClick={() => handleSendQuestion(inputQuery)}
          className="p-3 rounded-xl bg-[#8C7355] text-[#FFF8E7] hover:bg-[#755F43] transition-smooth cursor-pointer"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

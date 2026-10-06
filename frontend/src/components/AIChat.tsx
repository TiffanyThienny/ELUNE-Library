import React, { useState } from 'react';
import { useReader } from '../context/ReaderContext';
import { aiService } from '../services/api';
import { Send, BookOpen, User, MessageSquare } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export const AIChat: React.FC = () => {
  const { book } = useReader();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !book || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const questionText = input.trim();
    setInput('');
    setLoading(true);

    try {
      const res = await aiService.askQuestion(book.id, questionText);
      if (res.success && res.data?.chat) {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: res.data.chat.answer,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: err.message || 'Unable to retrieve insights from the text right now. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[480px] bg-white border border-[#E8DFD3] rounded-2xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[#F2ECE1] bg-[#FAF7F2] flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[#2C2421] text-white flex items-center justify-center">
          <BookOpen className="w-3.5 h-3.5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-[#2C2421]">Reading Companion</h4>
          <p className="text-[10px] text-[#8C7355]">Inquire about ideas and passages in this book</p>
        </div>
      </div>

      {/* Message stream */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#8C7355]">
            <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
            <p className="text-xs font-semibold text-[#2C2421]">Inquire about the text</p>
            <p className="text-[11px] text-[#665A4F] mt-1 max-w-[220px]">
              Ask questions about characters, philosophical concepts, or specific arguments within the book.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-6 h-6 rounded-full bg-[#EBDDC8] text-[#2C2421] flex items-center justify-center shrink-0 mt-0.5" title="Reading Companion">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[82%] p-2.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#2C2421] text-white rounded-tr-xs'
                    : 'bg-[#FAF7F2] border border-[#E8DFD3] text-[#2C2421] rounded-tl-xs'
                }`}
              >
                {msg.text}
              </div>

              {msg.sender === 'user' && (
                <div className="w-6 h-6 rounded-full bg-[#8C7355] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[#8C7355] text-xs">
            <div className="w-2 h-2 rounded-full bg-[#8C7355] animate-ping" />
            <span>Consulting book passages...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-2 border-t border-[#F2ECE1] bg-[#FAF7F2] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this book..."
          disabled={loading}
          className="flex-1 text-xs px-3 py-2 bg-white rounded-xl border border-[#E8DFD3] text-[#2C2421] focus:outline-hidden focus:border-[#8C7355]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 bg-[#2C2421] hover:bg-[#433832] text-white rounded-xl transition-colors disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

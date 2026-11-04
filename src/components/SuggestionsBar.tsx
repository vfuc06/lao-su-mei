import React from 'react';
import { Lightbulb, Send, Volume2 } from 'lucide-react';
import { Suggestion } from '../types';

interface SuggestionsBarProps {
  suggestions: Suggestion[];
  onSelectSuggestion: (text: string) => void;
  onPreviewSpeak: (text: string) => void;
  isLoading: boolean;
}

export const SuggestionsBar: React.FC<SuggestionsBarProps> = ({
  suggestions,
  onSelectSuggestion,
  onPreviewSpeak,
  isLoading,
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="w-full px-3 py-2 bg-gradient-to-r from-amber-50/70 via-stone-50 to-amber-50/70 border-t border-amber-100">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1.5">
        <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
        <span>Gợi ý câu trả lời (bấm để nói theo):</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
        {suggestions.map((item, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 flex items-center gap-1 bg-white border border-amber-200/90 rounded-2xl p-2 shadow-xs hover:border-amber-400 transition-all"
          >
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onSelectSuggestion(item.hanzi)}
              className="text-left group"
            >
              <div className="hanzi-text font-bold text-stone-900 group-hover:text-red-700 text-sm">
                {item.hanzi}
              </div>
              <div className="text-[11px] text-amber-700 font-medium">{item.pinyin}</div>
              <div className="text-[10px] text-stone-500">{item.vietnamese}</div>
            </button>

            {/* Nút bấm nghe thử câu gợi ý trước khi nói */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewSpeak(item.hanzi);
              }}
              title="Nghe cách phát âm"
              className="p-1 rounded-full text-stone-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>

            {/* Nút gửi luôn câu này */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onSelectSuggestion(item.hanzi)}
              title="Gửi câu này"
              className="p-1 rounded-full text-amber-600 hover:bg-amber-100 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};


import React from 'react';
import { Volume2, Snail, Lightbulb, AlertCircle } from 'lucide-react';
import { ChatMessage, UserSettings } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
  settings: UserSettings;
  isPlayingThis: boolean;
  onSpeak: (text: string, rateMultiplier?: number) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  settings,
  isPlayingThis,
  onSpeak,
}) => {
  const isAI = message.role === 'ai';

  if (!isAI) {
    // Tin nhắn của Học viên
    return (
      <div className="flex justify-end mb-4 px-2">
        <div className="max-w-[85%] bg-amber-500 text-white rounded-3xl rounded-tr-sm px-4 py-3 shadow-sm">
          <div className="text-xs text-amber-100 font-medium mb-0.5">Bạn</div>
          <div className="hanzi-text text-lg sm:text-xl font-medium leading-relaxed">
            {message.text}
          </div>
        </div>
      </div>
    );
  }

  // Tin nhắn của Gia sư Lão Sư Mei
  return (
    <div className="flex flex-col mb-5 px-2">
      <div className="flex items-start gap-2.5 max-w-[94%]">
        {/* Avatar Lão Sư Mei */}
        <div className="w-10 h-10 rounded-2xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-xs">
          美
        </div>

        {/* Nội dung phản hồi */}
        <div className="flex-1 bg-white rounded-3xl rounded-tl-sm p-4 shadow-sm border border-stone-200/80">
          <div className="text-xs font-semibold text-red-700 flex items-center justify-between mb-1.5">
            <span>Lão Sư Mei (美老师)</span>
            {isPlayingThis && (
              <span className="inline-flex items-center gap-1 text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                <Volume2 className="w-3 h-3" /> Đang nói...
              </span>
            )}
          </div>

          {/* 1. Hán tự to rõ */}
          <div className="hanzi-text text-2xl sm:text-3xl font-bold text-stone-900 leading-snug tracking-wide mb-1">
            {message.text}
          </div>

          {/* 2. Pinyin có dấu thanh */}
          {settings.showPinyin && message.pinyin && (
            <div className="text-sm sm:text-base font-medium text-amber-700 mb-1">
              {message.pinyin}
            </div>
          )}

          {/* 3. Nghĩa tiếng Việt */}
          {settings.showVietnamese && message.vietnamese && (
            <div className="text-xs sm:text-sm text-stone-600 italic mb-3">
              "{message.vietnamese}"
            </div>
          )}

          {/* Nút nghe lại & nghe chậm */}
          <div className="flex items-center gap-2 pt-1 border-t border-stone-100 mt-2">
            <button
              type="button"
              onClick={() => onSpeak(message.text, 1.0)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors active:scale-95"
            >
              <Volume2 className="w-3.5 h-3.5 text-stone-600" />
              <span>Nghe lại</span>
            </button>

            <button
              type="button"
              onClick={() => onSpeak(message.text, 0.75)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium transition-colors active:scale-95"
            >
              <Snail className="w-3.5 h-3.5 text-amber-600" />
              <span>Nghe chậm</span>
            </button>
          </div>

          {/* 4. Thẻ sửa lỗi nhẹ nhàng (Feedback Card) */}
          {message.feedback && message.feedback.hasMistake && (
            <div className="mt-3 p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-stone-800 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-rose-700 mb-1">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Gợi ý cách nói tự nhiên hơn:</span>
              </div>

              {message.feedback.better && (
                <div className="font-semibold hanzi-text text-sm text-rose-950 mb-1">
                  👉 {message.feedback.better}
                </div>
              )}

              {message.feedback.explanation && (
                <p className="text-stone-700 mb-1 leading-relaxed">
                  {message.feedback.explanation}
                </p>
              )}

              {message.feedback.pronunciationTip && (
                <div className="mt-1.5 pt-1.5 border-t border-rose-200/60 flex items-start gap-1 text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                  <span className="italic">{message.feedback.pronunciationTip}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


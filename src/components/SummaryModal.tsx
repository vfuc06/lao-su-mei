import React from 'react';
import { Award, Volume2, ArrowLeft, MessageSquare, BookOpen, Sparkles } from 'lucide-react';
import { WordItem } from '../types';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnHome: () => void;
  turnCount: number;
  newWords: WordItem[];
  onSpeakWord: (word: string) => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  onReturnHome,
  turnCount,
  newWords,
  onSpeakWord,
}) => {
  if (!isOpen) return null;

  // Loại bỏ các từ trùng lặp
  const uniqueWords = Array.from(
    new Map(newWords.map((item) => [item.hanzi, item])).values()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-3xl mb-2 shadow-inner">
            🎉
          </div>
          <h2 className="text-xl font-bold text-stone-900">
            Tổng kết buổi luyện tập!
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Lão Sư Mei rất tự hào về sự cố gắng của bạn hôm nay!
          </p>
        </div>

        {/* Thẻ thống kê */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-amber-800 font-semibold mb-1">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>Lượt đối thoại</span>
            </div>
            <div className="text-2xl font-black text-amber-900">{turnCount}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-red-800 font-semibold mb-1">
              <BookOpen className="w-4 h-4 text-red-600" />
              <span>Từ mới đã gặp</span>
            </div>
            <div className="text-2xl font-black text-red-900">{uniqueWords.length}</div>
          </div>
        </div>

        {/* Lời khen từ Lão Sư Mei */}
        <div className="mb-5 p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-stone-900">Nhận xét: </span>
            Bạn đã dám nói và phản xạ rất tự nhiên! Đừng sợ sai, mỗi lần nói là một lần bạn tiến gần hơn đến việc làm chủ tiếng Trung giao tiếp.
          </div>
        </div>

        {/* Danh sách từ mới */}
        {uniqueWords.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>📚 Từ mới đáng ghi nhớ:</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {uniqueWords.map((word, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50 border border-stone-100 hover:bg-amber-50/50 transition-colors"
                >
                  <div>
                    <div className="hanzi-text font-bold text-stone-900 text-base">
                      {word.hanzi}
                    </div>
                    <div className="text-xs text-amber-700 font-medium">
                      {word.pinyin}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {word.vietnamese}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSpeakWord(word.hanzi)}
                    title="Nghe phát âm từ này"
                    className="p-2 rounded-full bg-white text-stone-600 hover:text-red-700 hover:bg-red-50 shadow-xs border border-stone-200 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Các nút hành động */}
        <div className="space-y-2 pt-2 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition-all active:scale-98"
          >
            Tiếp tục nói chuyện thêm
          </button>

          <button
            type="button"
            onClick={onReturnHome}
            className="w-full py-2.5 px-4 rounded-2xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Chọn tình huống khác</span>
          </button>
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import { Layers, Sparkles } from 'lucide-react';

export const FlashcardsTab: React.FC = () => {
  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto animate-fade-in text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
        <Layers className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-black text-stone-900 mb-2">🗂 Từ vựng Flashcard</h2>
      <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed mb-6">
        Ôn tập thông minh theo thuật toán lặp lại ngắt quãng (SM-2) với 2 bộ thẻ: <b>HSK 1–4</b> và <b>Từ vựng công sở</b>.
      </p>

      <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs text-left space-y-3">
        <div className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Sẵn sàng ở Phase 5</span>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">
          Hỗ trợ 2 kiểu ôn: <b>Lật thẻ nhớ nghĩa</b> và <b>Nhìn nghĩa nói tiếng Trung</b> (bấm mic nói để chấm điểm tự động).
        </p>
      </div>
    </div>
  );
};

import React from 'react';
import { Headphones, Sparkles } from 'lucide-react';

interface ShadowingTabProps {
  onPracticePhrase?: (phrase: string) => void;
}

export const ShadowingTab: React.FC<ShadowingTabProps> = () => {
  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto animate-fade-in text-center">
      <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
        <Headphones className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-black text-stone-900 mb-2">🎧 Luyện nói Shadowing</h2>
      <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed mb-6">
        Nghe câu mẫu ➔ Nhại lại ➔ Hệ thống chấm điểm từng âm tiết xanh/cam/đỏ ➔ Lặp lại tới khi đạt chuẩn!
      </p>

      <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs text-left space-y-3">
        <div className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Sẵn sàng ở Phase 4</span>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">
          Bao gồm 2 chế độ: <b>Nhại lại câu mẫu</b> và <b>Đối đáp phản xạ</b> với kho mẫu câu Đời sống & Công sở phong phú.
        </p>
      </div>
    </div>
  );
};

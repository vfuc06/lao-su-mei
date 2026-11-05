import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

interface PhrasesTabProps {
  onPracticePhrase?: (qHanzi: string, aHanzi: string) => void;
}

export const PhrasesTab: React.FC<PhrasesTabProps> = () => {
  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto animate-fade-in text-center">
      <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
        <BookOpen className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-black text-stone-900 mb-2">📖 Mẫu câu giao tiếp</h2>
      <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed mb-6">
        Các cặp hỏi–đáp thông dụng hằng ngày: <b>Câu hỏi ở trên</b> và <b>Câu trả lời ngay bên dưới</b> kèm tính năng che đáp án tự kiểm tra.
      </p>

      <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs text-left space-y-3">
        <div className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Sẵn sàng ở Phase 3</span>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">
          Kho ~300 cặp câu Đời sống & Công sở phân nhóm khoa học, có nút "🎤 Luyện câu này" chuyển thẳng sang Shadowing.
        </p>
      </div>
    </div>
  );
};

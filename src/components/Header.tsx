import React from 'react';
import { ArrowLeft, Settings, Award, Minus, Plus } from 'lucide-react';
import { Scenario } from '../types';

interface HeaderProps {
  scenario: Scenario;
  level?: string;
  onBack: () => void;
  onOpenSettings: () => void;
  onFinishSession: () => void;
  onAdjustDifficulty?: (direction: 'easier' | 'harder') => void;
}

export const Header: React.FC<HeaderProps> = ({
  scenario,
  onBack,
  onOpenSettings,
  onFinishSession,
  onAdjustDifficulty,
}) => {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-200 px-3 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại danh sách tình huống"
          className="p-1.5 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{scenario.emoji}</span>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-stone-900 leading-tight truncate">
              {scenario.titleVi}
            </h1>
            <div className="text-[11px] text-stone-500 font-medium truncate">
              Vai: <span className="text-red-700 font-semibold">{scenario.aiRole}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Hai nút điều chỉnh độ khó Dễ hơn / Khó hơn */}
        {onAdjustDifficulty && (
          <div className="flex items-center gap-0.5 bg-stone-100 p-0.5 rounded-xl border border-stone-200/80 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => onAdjustDifficulty('easier')}
              className="px-2 py-1 rounded-lg hover:bg-white text-stone-600 hover:text-stone-900 transition-colors"
              title="Yêu cầu AI nói dễ hơn, dùng từ đơn giản hơn"
            >
              Dễ hơn
            </button>
            <span className="text-stone-300">|</span>
            <button
              type="button"
              onClick={() => onAdjustDifficulty('harder')}
              className="px-2 py-1 rounded-lg hover:bg-white text-stone-600 hover:text-stone-900 transition-colors"
              title="Yêu cầu AI nói tự nhiên, mở rộng từ vựng"
            >
              Khó hơn
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onFinishSession}
          title="Kết thúc và xem tổng kết buổi học"
          className="p-1.5 rounded-xl text-amber-600 hover:bg-amber-50 transition-colors"
        >
          <Award className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Cài đặt"
          className="p-1.5 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

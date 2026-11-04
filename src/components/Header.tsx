import React from 'react';
import { ArrowLeft, Settings, Award } from 'lucide-react';
import { Scenario, HSKLevel } from '../types';

interface HeaderProps {
  scenario: Scenario;
  level: HSKLevel;
  onBack: () => void;
  onOpenSettings: () => void;
  onFinishSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  scenario,
  level,
  onBack,
  onOpenSettings,
  onFinishSession,
}) => {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-200 px-3 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại danh sách tình huống"
          className="p-1.5 rounded-full text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xl">{scenario.emoji}</span>
          <div>
            <h1 className="text-sm font-bold text-stone-900 leading-tight line-clamp-1">
              {scenario.titleVi}
            </h1>
            <div className="text-[11px] text-stone-500 font-medium">
              Vai AI: <span className="text-amber-700">{scenario.aiRole}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
          {level}
        </span>

        <button
          type="button"
          onClick={onFinishSession}
          title="Kết thúc và xem tổng kết buổi học"
          className="p-1.5 rounded-full text-stone-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
        >
          <Award className="w-5 h-5 text-amber-600" />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Cài đặt"
          className="p-1.5 rounded-full text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};


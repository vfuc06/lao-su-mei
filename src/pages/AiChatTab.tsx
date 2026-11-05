import React, { useState } from 'react';
import { ConversationMode, Scenario } from '../types';
import { SCENARIOS } from '../lib/scenarios';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, Briefcase, Coffee, ArrowRight, ChevronDown, ChevronUp, Layers, BookMarked, Mic } from 'lucide-react';

interface AiChatTabProps {
  onSelectScenario: (scenario: Scenario) => void;
  onNavigateTab: (tab: 'flashcards' | 'shadowing' | 'phrases') => void;
  onOpenMistakes: () => void;
  onRequireAuth: () => void;
}

export const AiChatTab: React.FC<AiChatTabProps> = ({
  onSelectScenario,
  onNavigateTab,
  onOpenMistakes,
  onRequireAuth,
}) => {
  const { user, settings, updateSettings } = useAuth();
  const [activeMode, setActiveMode] = useState<ConversationMode>('daily');

  const filteredScenarios = SCENARIOS.filter((s) => s.mode === activeMode);

  const handleScenarioClick = (scenario: Scenario) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    onSelectScenario(scenario);
  };

  const handleAdjustLevel = (delta: number) => {
    const cur = settings.estimatedLevel || 1;
    const next = Math.max(1, Math.min(6, cur + delta));
    updateSettings({ estimatedLevel: next });
  };

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto animate-fade-in">
      {/* 1. Dải "Hôm nay" */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => onNavigateTab('flashcards')}
          className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl text-left shadow-2xs hover:scale-102 transition-transform"
        >
          <div className="flex items-center justify-between text-amber-900 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Từ vựng đến hạn</span>
            <Layers className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-base font-extrabold text-stone-900">🗂 Ôn tập thẻ</div>
          <p className="text-[10px] text-stone-500 mt-0.5">Lặp lại ngắt quãng SM-2</p>
        </button>

        <button
          type="button"
          onClick={onOpenMistakes}
          className="p-3 bg-gradient-to-br from-red-50 to-rose-50 border border-red-200/80 rounded-2xl text-left shadow-2xs hover:scale-102 transition-transform"
        >
          <div className="flex items-center justify-between text-red-900 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sổ câu cần sửa</span>
            <BookMarked className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-base font-extrabold text-stone-900">📝 Cần luyện lại</div>
          <p className="text-[10px] text-stone-500 mt-0.5">Sửa dứt điểm câu sai</p>
        </button>
      </div>

      {/* 2. Banner chào & Bộ điều chỉnh cấp độ */}
      <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-3xl p-5 mb-4 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-900/60 backdrop-blur-xs text-amber-200 text-[11px] font-semibold mb-2 border border-red-400/40">
            <Sparkles className="w-3 h-3" />
            <span>Gia sư AI nghiêm khắc 1-1</span>
          </div>
          <h2 className="text-xl font-black mb-1">Luyện nói với Lão Sư Mei</h2>
          <p className="text-xs text-red-100 leading-relaxed mb-3">
            Nói sai thì phải sửa và nói lại cho đúng (≥ 80%) mới được đi tiếp câu chuyện!
          </p>

          {/* Điều chỉnh độ khó tự thích ứng */}
          <div className="flex items-center justify-between bg-red-800/70 backdrop-blur-xs rounded-2xl px-3 py-2 border border-red-500/40">
            <div className="text-xs">
              <span className="text-red-200 text-[11px] block">Mức độ nói hiện tại:</span>
              <span className="font-bold text-amber-200">
                Cấp {settings.estimatedLevel || 1}/6 {settings.estimatedLevel <= 2 ? '(Cơ bản)' : settings.estimatedLevel <= 4 ? '(Trung bình)' : '(Nâng cao)'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleAdjustLevel(-1)}
                disabled={(settings.estimatedLevel || 1) <= 1}
                className="px-2.5 py-1 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40 text-xs font-bold active:scale-95"
              >
                Dễ hơn
              </button>
              <button
                type="button"
                onClick={() => handleAdjustLevel(1)}
                disabled={(settings.estimatedLevel || 1) >= 6}
                className="px-2.5 py-1 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40 text-xs font-bold active:scale-95"
              >
                Khó hơn
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Công tắc phân đoạn: Đời sống vs Công sở */}
      <div className="flex items-center p-1 bg-stone-200/80 rounded-2xl mb-4 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveMode('daily')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeMode === 'daily'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Coffee className="w-3.5 h-3.5 text-amber-600" />
          <span>🍜 Đời sống hằng ngày</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('workplace')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeMode === 'workplace'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 text-red-600" />
          <span>💼 Công sở & Đi làm</span>
        </button>
      </div>

      {/* 4. Danh sách thẻ tình huống */}
      <div className="space-y-2.5 mb-6">
        <div className="flex items-center justify-between px-1 text-xs text-stone-500 font-bold uppercase tracking-wider">
          <span>{activeMode === 'daily' ? '8 Tình huống đời sống' : '10 Tình huống công sở'}</span>
          <span>Chọn để vào luyện</span>
        </div>

        {filteredScenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => handleScenarioClick(scenario)}
            className="w-full p-3.5 bg-white hover:bg-stone-50 border border-stone-200/90 rounded-2xl flex items-center justify-between text-left shadow-2xs hover:shadow-xs transition-all active:scale-98 group"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <span className="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                {scenario.emoji}
              </span>
              <div className="min-w-0">
                <div className="font-bold text-sm text-stone-900 truncate">
                  {scenario.titleVi}
                </div>
                <div className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                  Vai AI: <span className="font-medium text-stone-700">{scenario.aiRole}</span>
                </div>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-stone-100 group-hover:bg-red-50 group-hover:text-red-600 text-stone-400 flex items-center justify-center flex-shrink-0 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>

      {/* 5. Mẹo luyện tập */}
      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1.5 text-amber-950">
          <Mic className="w-4 h-4 text-amber-700" />
          <span>Nguyên tắc luyện nói cùng Lão Sư Mei:</span>
        </div>
        <p>• Nói sai ngữ pháp hoặc từ vựng sẽ bị Mei dừng lại và bắt nói lại cho đúng.</p>
        <p>• Nếu bí từ hoặc muốn hỏi cách diễn đạt, hãy nói bằng <strong>tiếng Việt</strong> — Mei sẽ dạy câu tiếng Trung chuẩn và bắt bạn đọc lại.</p>
      </div>
    </div>
  );
};


import React from 'react';
import { Scenario } from '../types';
import { ChevronRight } from 'lucide-react';

interface ScenarioCardProps {
  scenario: Scenario;
  onClick: () => void;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 rounded-3xl bg-white border border-stone-200/90 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 active:scale-98 flex items-start gap-3.5 group"
    >
      <div className="w-12 h-12 rounded-2xl bg-amber-50 group-hover:bg-red-50 text-2xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs">
        {scenario.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-stone-900 group-hover:text-red-700 transition-colors text-base truncate">
            {scenario.titleVi}
          </h3>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-red-600 transition-transform group-hover:translate-x-0.5" />
        </div>

        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-2">
          {scenario.goalVi}
        </p>

        <div className="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-[11px] font-medium text-stone-600">
          Vai AI: <span className="text-amber-800 font-semibold">{scenario.aiRole}</span>
        </div>
      </div>
    </button>
  );
};


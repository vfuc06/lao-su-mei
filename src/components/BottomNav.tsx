import React from 'react';
import { TabType } from '../types';
import { MessageSquare, Headphones, Layers, BookOpen } from 'lucide-react';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'ai_chat', label: 'Nói với AI', icon: MessageSquare },
    { id: 'shadowing', label: 'Shadowing', icon: Headphones },
    { id: 'flashcards', label: 'Từ vựng', icon: Layers },
    { id: 'phrases', label: 'Mẫu câu', icon: BookOpen },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200/90 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-4 px-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
                isActive
                  ? 'text-red-600 font-bold'
                  : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
            >
              <div
                className={`w-10 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isActive ? 'bg-red-50 text-red-600' : 'text-stone-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[11px] tracking-tight mt-0.5 truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

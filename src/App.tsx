import React, { useState } from 'react';
import { TabType, Scenario } from './types';
import { SCENARIOS } from './lib/scenarios';
import { useAuth } from './contexts/AuthContext';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { SettingsSheet } from './components/SettingsSheet';
import { MistakesModal } from './components/MistakesModal';
import { AiChatTab } from './pages/AiChatTab';
import { ShadowingTab } from './pages/ShadowingTab';
import { FlashcardsTab } from './pages/FlashcardsTab';
import { PhrasesTab } from './pages/PhrasesTab';
import { ConversationScreen } from './pages/ConversationScreen';

export default function App() {
  const { user, settings, updateSettings } = useAuth();

  // Tab điều hướng dưới (4 tab)
  const [currentTab, setCurrentTab] = useState<TabType>('ai_chat');

  // Trạng thái hội thoại AI
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  // Trạng thái các Modal
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMistakesOpen, setIsMistakesOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>();

  // Danh sách voice trên thiết bị
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const all = window.speechSynthesis.getVoices();
        const zh = all.filter((v) => v.lang.includes('zh') || v.lang.includes('cmn'));
        setVoices(zh);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleSelectScenario = (scenario: Scenario) => {
    if (!user) {
      setAuthMessage('Tính năng nói với AI yêu cầu đăng nhập để lưu tiến trình và sử dụng hạn mức mỗi ngày.');
      setIsAuthOpen(true);
      return;
    }
    setSelectedScenario(scenario);
  };

  const handlePracticeMistakePhrase = (hanzi: string) => {
    setCurrentTab('shadowing');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-red-200">
      {/* 1. Header luôn cố định ở trên */}
      <AppHeader
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMistakes={() => setIsMistakesOpen(true)}
        onOpenAuth={() => {
          setAuthMessage(undefined);
          setIsAuthOpen(true);
        }}
      />

      {/* 2. Nội dung chính hiển thị theo Tab hoặc theo Phòng hội thoại */}
      <main className="flex-1 w-full">
        {selectedScenario ? (
          <ConversationScreen
            scenario={selectedScenario}
            level="HSK1"
            settings={settings}
            onUpdateSettings={updateSettings}
            onBackToHome={() => setSelectedScenario(null)}
          />
        ) : (
          <>
            {currentTab === 'ai_chat' && (
              <AiChatTab
                onSelectScenario={handleSelectScenario}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onOpenMistakes={() => setIsMistakesOpen(true)}
                onRequireAuth={() => {
                  setAuthMessage('Tính năng trò chuyện 1-1 với AI cần đăng nhập để quản lý hạn mức ngày và lưu tiến trình.');
                  setIsAuthOpen(true);
                }}
              />
            )}
            {currentTab === 'shadowing' && <ShadowingTab />}
            {currentTab === 'flashcards' && <FlashcardsTab />}
            {currentTab === 'phrases' && <PhrasesTab />}
          </>
        )}
      </main>

      {/* 3. Thanh điều hướng dưới 4 tab (ẩn khi đang trong phòng hội thoại) */}
      {!selectedScenario && (
        <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
      )}

      {/* 4. Các Modal & Sheet */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMessage={authMessage}
      />

      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        availableVoices={voices}
      />

      <MistakesModal
        isOpen={isMistakesOpen}
        onClose={() => setIsMistakesOpen(false)}
        onPracticePhrase={handlePracticeMistakePhrase}
      />
    </div>
  );
}

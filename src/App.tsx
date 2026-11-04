import React, { useState, useEffect } from 'react';
import { HSKLevel, Scenario, UserSettings } from './types';
import { SCENARIOS } from './lib/scenarios';
import { HomeScreen } from './pages/HomeScreen';
import { ConversationScreen } from './pages/ConversationScreen';

const DEFAULT_SETTINGS: UserSettings = {
  speechRate: 0.9,
  autoPlaySpeech: true,
  showPinyin: true,
  showVietnamese: true,
  correctionMode: 'gentle',
  selectedVoiceURI: null,
};

export default function App() {
  // Trạng thái màn hình: 'home' | 'conversation'
  const [currentScreen, setCurrentScreen] = useState<'home' | 'conversation'>('home');
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);

  // Trình độ HSK (lưu vào localStorage)
  const [level, setLevel] = useState<HSKLevel>(() => {
    try {
      const saved = localStorage.getItem('chinese_tutor_level');
      if (saved === 'HSK1' || saved === 'HSK2' || saved === 'HSK3') {
        return saved;
      }
    } catch (e) {
      // bỏ qua lỗi đọc localStorage
    }
    return 'HSK1';
  });

  // Cài đặt người dùng (lưu vào localStorage)
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('chinese_tutor_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      // bỏ qua lỗi
    }
    return DEFAULT_SETTINGS;
  });

  // Tự động lưu level vào localStorage
  const handleSelectLevel = (newLevel: HSKLevel) => {
    setLevel(newLevel);
    try {
      localStorage.setItem('chinese_tutor_level', newLevel);
    } catch (e) {}
  };

  // Cập nhật cài đặt
  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('chinese_tutor_settings', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Chọn tình huống và vào phòng hội thoại
  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setCurrentScreen('conversation');
    try {
      localStorage.setItem('chinese_tutor_scenario', scenario.id);
    } catch (e) {}
  };

  // Quay lại trang chủ
  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

  return (
    <main className="w-full min-h-screen bg-stone-50 text-stone-900">
      {currentScreen === 'home' ? (
        <HomeScreen
          level={level}
          onSelectLevel={handleSelectLevel}
          onSelectScenario={handleSelectScenario}
        />
      ) : (
        <ConversationScreen
          scenario={selectedScenario}
          level={level}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onBackToHome={handleBackToHome}
        />
      )}
    </main>
  );
}

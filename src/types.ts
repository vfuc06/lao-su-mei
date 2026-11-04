// Định nghĩa các kiểu dữ liệu dùng trong toàn bộ ứng dụng

export type HSKLevel = 'HSK1' | 'HSK2' | 'HSK3';

export type CorrectionMode = 'gentle' | 'immediate';

export type SpeechSpeed = 'slow' | 'normal' | 'fast';

export interface Scenario {
  id: string;
  emoji: string;
  titleVi: string;
  aiRole: string;
  goalVi: string;
  openingHint: string;
}

export interface WordItem {
  hanzi: string;
  pinyin: string;
  vietnamese: string;
}

export interface Suggestion {
  hanzi: string;
  pinyin: string;
  vietnamese: string;
}

export interface Feedback {
  hasMistake: boolean;
  userSaid?: string;
  better?: string;
  explanation?: string;
  pronunciationTip?: string;
}

export interface AIChatResponse {
  reply: {
    hanzi: string;
    pinyin: string;
    vietnamese: string;
  };
  feedback: Feedback;
  suggestions: Suggestion[];
  newWords: WordItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  pinyin?: string;
  vietnamese?: string;
  feedback?: Feedback;
  suggestions?: Suggestion[];
  newWords?: WordItem[];
  timestamp: number;
}

export interface UserSettings {
  speechRate: number; // 0.75 (chậm), 1.0 (thường)
  autoPlaySpeech: boolean;
  showPinyin: boolean;
  showVietnamese: boolean;
  correctionMode: CorrectionMode;
  selectedVoiceURI: string | null;
}

export interface ChatApiRequest {
  scenarioId: string;
  level: HSKLevel;
  correctionMode: CorrectionMode;
  history: Array<{ role: 'user' | 'ai'; text: string }>;
  userInput: string;
  inputLang: 'zh' | 'vi';
}


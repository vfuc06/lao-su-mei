// Định nghĩa toàn bộ kiểu dữ liệu cho dự án Web Gia Sư Tiếng Trung (Bản 2)

export type TabType = 'ai_chat' | 'shadowing' | 'flashcards' | 'phrases';

export type ConversationMode = 'daily' | 'workplace';

export type StrictnessLevel = 'strict' | 'relaxed';

export type HSKLevel = 'HSK1' | 'HSK2' | 'HSK3' | 'HSK4';

export interface ZhLine {
  hanzi: string;
  pinyin: string;
  vietnamese: string;
}

// Backward-compat aliases
export type WordItem = ZhLine;
export type Suggestion = ZhLine;
export type CorrectionMode = 'gentle' | 'immediate';

export interface UserSettings {
  speechRate: number; // 0.8 (chậm), 1.0 (vừa), 1.2 (thường)
  autoPlay: boolean;
  autoPlaySpeech?: boolean; // alias
  showPinyin: boolean;
  showVi: boolean;
  showVietnamese?: boolean; // alias
  passThreshold: number; // 70, 80, 90, 100 (mặc định 80)
  strictness: StrictnessLevel; // 'strict' (mặc định) | 'relaxed'
  correctionMode?: CorrectionMode; // alias
  dailyNewCards: number; // 5-30 (mặc định 10)
  estimatedLevel: number; // 1-6 (mặc định 1)
  selectedVoiceURI: string | null;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  settings: UserSettings;
  createdAt: string;
}

export interface Scenario {
  id: string;
  mode: ConversationMode;
  emoji: string;
  titleVi: string;
  aiRole: string;
  goalVi: string;
  openingHint?: string;
}

// ===== PHRASES (MẪU CÂU) =====
export interface PhraseGroup {
  id: number;
  kind: ConversationMode;
  slug: string;
  emoji: string;
  titleVi: string;
  sort: number;
  totalCount?: number;
  passedCount?: number;
}

export interface PhrasePair {
  id: number;
  groupId: number;
  sort: number;
  qHanzi: string;
  qPinyin: string;
  qVi: string;
  aHanzi: string;
  aPinyin: string;
  aVi: string;
  noteVi?: string;
  favorited?: boolean;
  bestScore?: number;
  attempts?: number;
  passed?: boolean;
}

// ===== FLASHCARDS (TỪ VỰNG) =====
export interface VocabCard {
  id: number;
  deck: 'hsk' | 'workplace';
  hskLevel?: number; // 1 - 4
  category?: string; // dùng cho từ vựng công sở
  hanzi: string;
  pinyin: string;
  vi: string;
  exampleHanzi?: string;
  examplePinyin?: string;
  exampleVi?: string;
  sort?: number;
}

export interface UserCardProgress {
  userId: string;
  cardId: number;
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt?: string;
}

// ===== SCORING (CHẤM ĐIỂM ÂM TIẾT) =====
export interface SyllableMatch {
  target: string;
  heard: string;
  status: 'ok' | 'tone' | 'wrong' | 'missing';
}

export interface ScoreOutput {
  score: number;
  perSyllable: SyllableMatch[];
  extra: string[];
  passed: boolean;
}

// ===== CHAT VỚI AI & GIA SƯ NGHIÊM =====
export type ChatAction = 'start' | 'turn' | 'resume' | 'hint';

export type ErrorType =
  | 'grammar'
  | 'word_choice'
  | 'word_order'
  | 'measure_word'
  | 'register'
  | 'vietnamese_input';

export interface CorrectionChunk {
  hanzi: string;
  pinyin: string;
}

export interface CorrectionDetails {
  errorType: ErrorType;
  wrongPart: string;
  target: ZhLine;
  acceptableVariants: string[];
  explanationVi: string;
  directionVi: string;
  chunks: CorrectionChunk[];
}

export interface AIChatTurnResponse {
  verdict: 'correct' | 'needs_correction';
  understood?: string;
  praiseVi?: string;
  reply?: ZhLine;
  correction?: CorrectionDetails;
  suggestions: ZhLine[];
  newWords: ZhLine[];
}

export interface AIChatStartResponse {
  reply: ZhLine;
  suggestions: ZhLine[];
}

export interface AIChatResumeResponse {
  praiseVi: string;
  reply: ZhLine;
  suggestions: ZhLine[];
  newWords: ZhLine[];
}

export interface AIChatHintResponse {
  hintVi: string;
  mnemonicVi?: string;
}

// Backward compatibility types
export type AIChatResponse = any;
export type ChatApiRequest = any;

export interface ChatTurnItem {
  id: string;
  role: 'user' | 'ai';
  text: string;
  pinyin?: string;
  vietnamese?: string;
  verdict?: 'correct' | 'needs_correction';
  correction?: CorrectionDetails;
  evaluation?: any;
  feedback?: any;
  praiseVi?: string;
  suggestions?: ZhLine[];
  newWords?: ZhLine[];
  timestamp: number;
}

export type ChatMessage = ChatTurnItem;

export interface MistakeItem {
  id: number;
  userSaid: string;
  correctHanzi: string;
  correctPinyin?: string;
  correctVi?: string;
  explanation?: string;
  errorType?: string;
  attempts: number;
  bestScore: number;
  passed: boolean;
  createdAt: string;
}

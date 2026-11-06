import React, { useState, useEffect, useRef } from 'react';
import { VocabCard, UserCardProgress, ScoreOutput } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calculateSM2, getEstimatedIntervals, CardRating } from '../lib/sm2';
import { evaluatePronunciation } from '../lib/scoring';
import { getTipForSyllable } from '../lib/pronunciationTips';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ZhText } from '../components/ZhText';
import { ScoreRing } from '../components/ScoreRing';
import { SyllableDiff } from '../components/SyllableDiff';
import { playZhAudio } from '../lib/audio';
import { INITIAL_VOCAB_CARDS } from '../lib/initialData';
import {
  Layers,
  Sparkles,
  Volume2,
  Turtle,
  RotateCcw,
  Mic,
  Square,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Briefcase,
  BookOpen,
  Calendar,
  Award,
  Loader2,
  X,
  Play,
} from 'lucide-react';

interface CardWithProgress extends VocabCard {
  progress?: UserCardProgress;
}

const WORKPLACE_CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: 'all', label: 'Tất cả', emoji: '🌟' },
  { id: 'meeting', label: 'Họp hành', emoji: '🤝' },
  { id: 'report', label: 'Báo cáo', emoji: '📊' },
  { id: 'office', label: 'Hành chính', emoji: '🏢' },
  { id: 'client', label: 'Khách hàng', emoji: '🧾' },
  { id: 'operation', label: 'Vận hành', emoji: '🛠' },
];

export const FlashcardsTab: React.FC = () => {
  const { user, settings } = useAuth();

  // Chọn bộ thẻ: HSK 1-4 vs Công sở
  const [activeDeck, setActiveDeck] = useState<'hsk' | 'workplace'>('hsk');
  const [selectedHskLevel, setSelectedHskLevel] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Chế độ ôn tập: Lật thẻ (flip) vs Đọc to (voice)
  const [studyMode, setStudyMode] = useState<'flip' | 'voice'>('flip');

  // Danh sách từ vựng & tiến trình
  const [allCards, setAllCards] = useState<CardWithProgress[]>(INITIAL_VOCAB_CARDS);
  const [isLoading, setIsLoading] = useState(false);

  // Phân trang / Lazy load 30 từ một lần để không giật lag khi CSDL nhiều nghìn từ
  const [visibleCount, setVisibleCount] = useState<number>(30);

  // Buổi học hiện tại
  const [isStudying, setIsStudying] = useState(false);
  const [studyQueue, setStudyQueue] = useState<CardWithProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSessionFinished, setIsSessionFinished] = useState(false);
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);

  // Trạng thái mic & chấm điểm cho chế độ Đọc to
  const [heardText, setHeardText] = useState('');
  const [voiceScore, setVoiceScore] = useState<ScoreOutput | null>(null);
  const [activeVoiceTip, setActiveVoiceTip] = useState<string | null>(null);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);

  // Lưu và tiếp tục tiến trình học dở (để lần sau vào học tiếp mà không mất)
  const sessionSaveKey = `lao_su_mei_fc_session_${activeDeck}_${selectedHskLevel}_${selectedCategory}`;
  const [savedSessionIndex, setSavedSessionIndex] = useState<number | null>(null);

  // Đọc lại phiên học dở khi đổi bộ lọc
  useEffect(() => {
    try {
      const raw = localStorage.getItem(sessionSaveKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.index === 'number' && parsed.index > 0) {
          setSavedSessionIndex(parsed.index);
          return;
        }
      }
    } catch (e) {}
    setSavedSessionIndex(null);
    setVisibleCount(30); // reset lazy load về 30 từ đầu
  }, [sessionSaveKey]);

  // Cập nhật thẻ hiện tại
  const currentCard = studyQueue[currentIndex];

  // Tự động phát âm khi sang từ mới trong buổi học ôn tập
  useEffect(() => {
    if (isStudying && currentCard && settings.autoPlay !== false) {
      const timer = setTimeout(() => {
        playZhAudio(currentCard.hanzi, settings.speechRate || 1.0);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isStudying]);

  // Hook nhận diện giọng nói
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: 'zh-CN',
    onResult: (spokenText) => {
      setHeardText(spokenText);
      if (currentCard) {
        handleEvaluateVoice(spokenText, currentCard);
      }
    },
  });

  // Tải thẻ từ vựng và tiến trình
  const fetchCardsAndProgress = async () => {
    let cards: VocabCard[] = INITIAL_VOCAB_CARDS;
    const progressMap = new Map<number, UserCardProgress>();

    try {
      if (isSupabaseConfigured) {
        // 1. Tải danh sách thẻ từ Database (nếu người dùng thêm từ mới)
        const { data: cardsData } = await supabase
          .from('vocab_cards')
          .select('*')
          .order('sort', { ascending: true });

        if (cardsData && cardsData.length > 0) {
          cards = cardsData.map((c: any) => ({
            id: c.id,
            deck: c.deck,
            hskLevel: c.hsk_level,
            category: c.category,
            hanzi: c.hanzi,
            pinyin: c.pinyin,
            vi: c.vi,
            exampleHanzi: c.example_hanzi,
            examplePinyin: c.example_pinyin,
            exampleVi: c.example_vi,
            sort: c.sort,
          }));
        }

        // 2. Tải tiến trình nếu đã đăng nhập
        if (user) {
          const { data: progData } = await supabase
            .from('user_card_progress')
            .select('*')
            .eq('user_id', user.id);

          if (progData) {
            progData.forEach((p: any) => {
              progressMap.set(p.card_id, {
                userId: p.user_id,
                cardId: p.card_id,
                ease: p.ease,
                intervalDays: p.interval_days,
                repetitions: p.repetitions,
                lapses: p.lapses,
                dueAt: p.due_at,
                lastReviewedAt: p.last_reviewed_at,
              });
            });
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi tải tiến trình thẻ từ Supabase, dùng bộ nhớ cục bộ:', err);
    }

    // Fallback đọc LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const localProg = JSON.parse(localStorage.getItem('webchinese_card_progress') || '{}');
        Object.keys(localProg).forEach((cardIdStr) => {
          const cardId = Number(cardIdStr);
          if (!progressMap.has(cardId)) {
            progressMap.set(cardId, localProg[cardIdStr]);
          }
        });
      } catch (e) {}
    }

    const merged: CardWithProgress[] = cards.map((c) => ({
      ...c,
      progress: progressMap.get(c.id),
    }));

    setAllCards(merged);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCardsAndProgress();
  }, [user]);

  // Lọc thẻ theo bộ, cấp độ hoặc danh mục
  const filteredCards = allCards.filter((c) => {
    if (c.deck !== activeDeck) return false;
    if (activeDeck === 'hsk' && selectedHskLevel !== 'all' && c.hskLevel !== selectedHskLevel) {
      return false;
    }
    if (activeDeck === 'workplace' && selectedCategory !== 'all' && c.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Phân loại thẻ: Đến hạn (due) vs Thẻ mới (new) vs Đã thuộc
  const now = new Date();
  const dueCards = filteredCards.filter(
    (c) => c.progress && new Date(c.progress.dueAt) <= now
  );
  const newCards = filteredCards.filter((c) => !c.progress);
  const masteredCards = filteredCards.filter(
    (c) => c.progress && c.progress.repetitions >= 3
  );

  // Bắt đầu buổi học: KHÔNG GIỚI HẠN SỐ TỪ - học bao nhiêu từ tùy thích
  const startSession = (resumeFromIndex: number = 0) => {
    if (filteredCards.length === 0) {
      alert('Chưa có thẻ nào trong bộ này.');
      return;
    }

    // Đưa thẻ cần ôn lên đầu, sau đó đến thẻ mới và thẻ đã thuộc
    const queue = [
      ...dueCards,
      ...newCards,
      ...masteredCards.filter((c) => !dueCards.includes(c)),
    ];

    const finalQueue = queue.length > 0 ? queue : filteredCards;
    setStudyQueue(finalQueue);

    const safeIndex = Math.min(resumeFromIndex, Math.max(0, finalQueue.length - 1));
    setCurrentIndex(safeIndex);
    setIsFlipped(false);
    setIsStudying(true);
    setIsSessionFinished(false);
    setSessionCompletedCount(safeIndex);
    setHeardText('');
    setVoiceScore(null);
    setActiveVoiceTip(null);

    // Lưu lại vị trí để lần sau tiếp tục
    try {
      localStorage.setItem(
        sessionSaveKey,
        JSON.stringify({ index: safeIndex, total: finalQueue.length, time: Date.now() })
      );
    } catch (e) {}
  };

  // Phát âm Hán tự
  const speakHanzi = (text: string, rate: number = 1.0) => {
    playZhAudio(text, rate);
  };

  // Lật qua lật lại mặt trước / sau (chữ Hán ⇋ nghĩa Việt)
  const toggleFlip = () => {
    setIsFlipped((prev) => {
      const next = !prev;
      if (next && currentCard) {
        speakHanzi(currentCard.hanzi, settings.speechRate || 1.0);
      }
      return next;
    });
  };

  // Chuyển thẻ tiếp theo ngay lập tức 0ms
  const handleNextCard = () => {
    if (currentIndex + 1 < studyQueue.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setIsFlipped(false);
      setHeardText('');
      setVoiceScore(null);
      setActiveVoiceTip(null);
      // Lưu lại tiến trình
      try {
        localStorage.setItem(
          sessionSaveKey,
          JSON.stringify({ index: nextIdx, total: studyQueue.length, time: Date.now() })
        );
      } catch (e) {}
    } else {
      setIsSessionFinished(true);
      setIsStudying(false);
      try {
        localStorage.removeItem(sessionSaveKey);
      } catch (e) {}
    }
  };

  // Về thẻ trước đó
  const handlePrevCard = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setIsFlipped(false);
      setHeardText('');
      setVoiceScore(null);
      setActiveVoiceTip(null);
      try {
        localStorage.setItem(
          sessionSaveKey,
          JSON.stringify({ index: prevIdx, total: studyQueue.length, time: Date.now() })
        );
      } catch (e) {}
    }
  };

  // Lưu tiến trình chạy ngầm KHÔNG block UI
  const saveProgressInBackground = (cardId: number, progress: UserCardProgress) => {
    // 1. Lưu LocalStorage ngay lập tức
    if (typeof window !== 'undefined') {
      try {
        const localProg = JSON.parse(localStorage.getItem('webchinese_card_progress') || '{}');
        localProg[cardId] = progress;
        localStorage.setItem('webchinese_card_progress', JSON.stringify(localProg));
      } catch (e) {}
    }

    // 2. Đồng bộ ngầm lên Supabase nếu có đăng nhập
    if (user && isSupabaseConfigured) {
      (async () => {
        try {
          await supabase.from('user_card_progress').upsert({
            user_id: user.id,
            card_id: cardId,
            ease: progress.ease,
            interval_days: progress.intervalDays,
            repetitions: progress.repetitions,
            lapses: progress.lapses,
            due_at: progress.dueAt,
            last_reviewed_at: progress.lastReviewedAt,
          });

          const todayVn = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
          await supabase.rpc('increment_daily_activity', {
            p_user_id: user.id,
            p_day: todayVn,
            p_column: 'cards_reviewed',
          });
        } catch (err) {
          console.warn('Lưu ngầm tiến trình thẻ:', err);
        }
      })();
    }
  };

  // Chấm điểm phát âm ở chế độ Đọc to
  const handleEvaluateVoice = (spokenText: string, card: CardWithProgress) => {
    const res = evaluatePronunciation(card.hanzi, spokenText, [], settings.passThreshold || 80);
    setVoiceScore(res);

    // Mẹo phát âm thanh điệu nếu đọc chưa chuẩn
    const failedSyllable = res.perSyllable.find((s) => s.status !== 'ok');
    if (failedSyllable) {
      setActiveVoiceTip(getTipForSyllable(failedSyllable.target));
    } else {
      setActiveVoiceTip(null);
    }

    if (res.passed) {
      setIsFlipped(true);
      const timer = setTimeout(() => {
        handleRateCard('good');
      }, 1500);
      setAutoAdvanceTimer(timer);
    }
  };

  // Đánh giá thẻ (Again, Hard, Good, Easy) theo SM-2 và CHUYỂN NGAY 0ms
  const handleRateCard = (rating: CardRating) => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }

    if (!currentCard) return;

    const sm2Result = calculateSM2(currentCard.progress, rating);

    const newProgress: UserCardProgress = {
      userId: user?.id || 'guest',
      cardId: currentCard.id,
      ease: sm2Result.ease,
      intervalDays: sm2Result.intervalDays,
      repetitions: sm2Result.repetitions,
      lapses: sm2Result.lapses,
      dueAt: sm2Result.dueAt,
      lastReviewedAt: new Date().toISOString(),
    };

    // Cập nhật state nội bộ ngay lập tức
    setAllCards((prev) =>
      prev.map((c) => (c.id === currentCard.id ? { ...c, progress: newProgress } : c))
    );

    // Lưu ngầm
    saveProgressInBackground(currentCard.id, newProgress);

    setSessionCompletedCount((prev) => prev + 1);

    // Chuyển thẻ tiếp theo
    handleNextCard();
  };

  const estimatedIntervals = currentCard
    ? getEstimatedIntervals(currentCard.progress)
    : null;

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto animate-fade-in">
      {/* ============================================================== */}
      {/* 1. MÀN HÌNH SẢNH CHỌN BỘ THẺ ÔN TẬP */}
      {/* ============================================================== */}
      {!isStudying && !isSessionFinished && (
        <div className="space-y-4">
          {/* Header tiêu đề */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <span>📦</span>
                <span>Từ vựng Flashcard</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Ôn ngắt quãng SM-2 · Nhớ lâu hơn gấp 3 lần · Học không giới hạn
              </p>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
              SM2
            </div>
          </div>

          {/* Chọn nguồn thẻ: HSK 1-4 vs Công sở */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveDeck('hsk');
              }}
              className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeDeck === 'hsk'
                  ? 'border-red-500 bg-red-50 text-red-700 shadow-2xs ring-1 ring-red-500/20'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              <BookOpen className="w-4 h-4 text-red-600" />
              <span>Giao tiếp HSK 1–4</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveDeck('workplace');
              }}
              className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeDeck === 'workplace'
                  ? 'border-red-500 bg-red-50 text-red-700 shadow-2xs ring-1 ring-red-500/20'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              <Briefcase className="w-4 h-4 text-red-600" />
              <span>Từ vựng Công sở</span>
            </button>
          </div>

          {/* Bộ lọc cấp độ HSK hoặc nhóm Công sở */}
          {activeDeck === 'hsk' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
              {(['all', 1, 2, 3, 4] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedHskLevel(lvl as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    selectedHskLevel === lvl
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {lvl === 'all' ? 'Tất cả cấp' : `HSK ${lvl}`}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
              {WORKPLACE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Thẻ thống kê tổng quan (HỌC KHÔNG GIỚI HẠN) */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-2xs space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-red-50/70 rounded-2xl border border-red-100">
                <div className="text-xl font-black text-red-600">{dueCards.length}</div>
                <div className="text-[11px] font-bold text-red-900 mt-0.5">Cần ôn</div>
                <div className="text-[10px] text-red-600/80">đến hạn ôn lại</div>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100">
                <div className="text-xl font-black text-amber-600">{filteredCards.length}</div>
                <div className="text-[11px] font-bold text-amber-900 mt-0.5">Tổng số thẻ</div>
                <div className="text-[10px] text-amber-600/80">học không giới hạn</div>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100">
                <div className="text-xl font-black text-emerald-600">{masteredCards.length}</div>
                <div className="text-[11px] font-bold text-emerald-900 mt-0.5">Đã thuộc</div>
                <div className="text-[10px] text-emerald-600/80">≥ 3 lần nhớ</div>
              </div>
            </div>

            {/* Chế độ ôn tập */}
            <div className="pt-2 border-t border-stone-100">
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                Chọn chế độ ôn luyện:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStudyMode('flip')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    studyMode === 'flip'
                      ? 'bg-red-50/80 border-red-500 ring-2 ring-red-500/20'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100/60'
                  }`}
                >
                  <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                    <span>🎴</span>
                    <span>Lật thẻ (Nhanh)</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Nhìn chữ Hán, tự nhớ nghĩa rồi lật kiểm tra.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStudyMode('voice')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    studyMode === 'voice'
                      ? 'bg-red-50/80 border-red-500 ring-2 ring-red-500/20'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100/60'
                  }`}
                >
                  <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                    <span>🎙️</span>
                    <span>Đọc to (Luyện nói)</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Bấm mic đọc to, AI chấm điểm chuẩn mới lật thẻ.
                  </div>
                </button>
              </div>
            </div>

            {/* Nút tiếp tục học dở nếu có */}
            {savedSessionIndex !== null && savedSessionIndex > 0 && savedSessionIndex < filteredCards.length && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-900">
                    📖 Bạn đang học dở thẻ {savedSessionIndex + 1}/{filteredCards.length}
                  </div>
                  <div className="text-[10px] text-amber-700">Tiến trình đã được lưu lại an toàn</div>
                </div>
                <button
                  type="button"
                  onClick={() => startSession(savedSessionIndex)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Học tiếp</span>
                </button>
              </div>
            )}

            {/* Nút bắt đầu học toàn bộ thẻ */}
            <button
              type="button"
              onClick={() => startSession(0)}
              disabled={isLoading || filteredCards.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-bold text-sm shadow-md shadow-red-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang chuẩn bị bộ thẻ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt đầu học toàn bộ ({filteredCards.length} thẻ)</span>
                </>
              )}
            </button>
          </div>

          {/* DANH SÁCH XEM NHANH (PHÂN ĐOẠN 30 TỪ ĐỂ KHÔNG BỊ LAG) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Danh sách thẻ trong bộ ({filteredCards.length} từ):
              </span>
              <span className="text-[11px] text-stone-400">Chạm để nghe thử</span>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200/90 divide-y divide-stone-100 shadow-2xs overflow-hidden">
              {filteredCards.slice(0, visibleCount).map((card) => (
                <div
                  key={card.id}
                  className="p-3.5 flex items-center justify-between hover:bg-stone-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => speakHanzi(card.hanzi)}
                      className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 transition-all flex-shrink-0"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-stone-900 text-base">{card.hanzi}</span>
                        <span className="text-xs font-bold text-red-600 font-mono">[{card.pinyin}]</span>
                      </div>
                      <div className="text-xs text-stone-600 truncate">{card.vi}</div>
                    </div>
                  </div>

                  {card.progress && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Nhớ {card.progress.repetitions} lần
                    </span>
                  )}
                </div>
              ))}

              {/* Tải thêm 30 từ khi lướt xuống để mượt mà không lag */}
              {filteredCards.length > visibleCount && (
                <div className="p-3 bg-stone-50/70 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 30)}
                    className="py-2 px-4 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold text-xs shadow-2xs active:scale-95 transition-all"
                  >
                    ⬇️ Tải thêm 30 từ tiếp theo (còn {filteredCards.length - visibleCount} từ)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MÀN HÌNH ĐANG ÔN TẬP THẺ (FLASHCARD SESSION) */}
      {/* ============================================================== */}
      {isStudying && currentCard && (
        <div className="space-y-4">
          {/* Thanh điều hướng trên cùng của phiên */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <button
              type="button"
              onClick={() => {
                if (confirm('Bạn có muốn tạm dừng? Tiến trình của bạn đã được lưu lại để học tiếp.')) {
                  setIsStudying(false);
                }
              }}
              className="p-1.5 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Thoát phiên ôn"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <span>Thẻ</span>
              <span className="text-red-600">{currentIndex + 1}</span>
              <span>/</span>
              <span>{studyQueue.length}</span>
            </div>

            <div className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {studyMode === 'flip' ? '🎴 Lật thẻ' : '🎙️ Đọc to'}
            </div>
          </div>

          {/* Thanh tiến trình nhỏ */}
          <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-red-600 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / studyQueue.length) * 100}%` }}
            />
          </div>

          {/* KHỐI THẺ FLASHCARD CHÍNH (BẤM VÀO BẤT KỲ ĐÂU ĐỂ LẬT MẶT TRƯỚC / SAU) */}
          <div
            onClick={toggleFlip}
            className="bg-white rounded-3xl border-2 border-stone-200/90 shadow-md p-6 min-h-[380px] flex flex-col justify-between relative transition-all active:scale-[0.99] cursor-pointer select-none hover:border-red-300"
          >
            {/* Phía trên thẻ: Nút nghe phát âm */}
            <div className="flex items-center justify-between w-full" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                {currentCard.deck === 'hsk'
                  ? `HSK ${currentCard.hskLevel || 1}`
                  : `Công sở · ${currentCard.category || 'Chung'}`}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => speakHanzi(currentCard.hanzi, 1.0)}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-600 active:scale-95 transition-all"
                  title="Nghe phát âm chuẩn"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => speakHanzi(currentCard.hanzi, 0.75)}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-600 active:scale-95 transition-all"
                  title="Nghe chậm"
                >
                  <Turtle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* NỘI DUNG MẶT TRƯỚC / MẶT SAU */}
            <div className="my-auto text-center py-4">
              <div className="text-5xl font-black text-stone-900 tracking-wide font-sans mb-3">
                {currentCard.hanzi}
              </div>

              {/* Nếu đã lật: Hiện pinyin, nghĩa Việt và ví dụ */}
              {isFlipped ? (
                <div className="space-y-3 animate-fade-in">
                  <div className="text-xl font-bold text-red-600 font-mono">
                    {currentCard.pinyin}
                  </div>
                  <div className="text-base font-bold text-stone-800">
                    {currentCard.vi}
                  </div>

                  {/* Câu ví dụ thực tế */}
                  {currentCard.exampleHanzi && (
                    <div
                      className="mt-4 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                        Ví dụ thực tế:
                      </div>
                      <ZhText
                        hanzi={currentCard.exampleHanzi}
                        pinyin={currentCard.examplePinyin || ''}
                        vietnamese={currentCard.exampleVi || ''}
                        fontSize="sm"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-stone-400 mt-2 flex items-center justify-center gap-1">
                  <span>👆 Chạm vào thẻ hoặc bấm nút dưới để lật</span>
                </div>
              )}
            </div>

            {/* DƯỚI THẺ: THANH CHỈ BÁO LẬT */}
            <div className="text-center pt-2">
              <span className="text-[11px] font-semibold text-stone-400">
                {isFlipped ? '🔄 Đang hiện: Mặt sau (Nghĩa tiếng Việt)' : '🔄 Đang hiện: Mặt trước (Chữ Hán)'}
              </span>
            </div>
          </div>

          {/* PHẦN ĐIỀU KHIỂN & CHUYỂN THẺ TIẾP THEO (KHÔNG BAO GIỜ BỊ KẸT) */}
          <div className="space-y-3">
            {/* 1. Hàng nút điều hướng và lật thẻ linh hoạt */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevCard}
                disabled={currentIndex === 0}
                className="py-3 px-3.5 rounded-2xl bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                title="Về thẻ trước"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Trước</span>
              </button>

              <button
                type="button"
                onClick={toggleFlip}
                className="flex-1 py-3 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isFlipped ? 'Lật về chữ Hán' : 'Lật xem nghĩa & Pinyin'}</span>
              </button>

              <button
                type="button"
                onClick={handleNextCard}
                className="py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                title="Sang thẻ tiếp theo"
              >
                <span>{currentIndex + 1 === studyQueue.length ? 'Hoàn thành' : 'Tiếp'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Chế độ Đọc to (Voice Mode): Mic thu âm & Chấm điểm & Góp ý sửa */}
            {studyMode === 'voice' && !isFlipped && (
              <div className="space-y-2.5 p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                {voiceScore && (
                  <div className="space-y-2 pb-2.5 border-b border-stone-100 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-stone-800">
                          Bạn đã đọc: <span className="text-stone-900 font-extrabold">{heardText || '(chưa nghe rõ)'}</span>
                        </div>
                        <div className={`text-[11px] font-bold mt-0.5 ${voiceScore.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {voiceScore.passed ? '🎉 Chuẩn xác! Bạn phát âm rất tốt' : '💪 Chưa đúng, bạn bấm mic đọc lại nhé!'}
                        </div>
                      </div>
                      <ScoreRing score={voiceScore.score} size="sm" passThreshold={settings.passThreshold || 80} />
                    </div>

                    {/* Chi tiết từng âm tiết đúng/sai */}
                    <div className="pt-1">
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                        Chi tiết từng âm tiết:
                      </div>
                      <SyllableDiff perSyllable={voiceScore.perSyllable} extra={voiceScore.extra} />
                    </div>

                    {/* Mẹo / Góp ý phát âm khi đọc sai */}
                    {activeVoiceTip && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                        💡 Góp ý: {activeVoiceTip}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => (isListening ? stopListening() : startListening())}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    isListening
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  {isListening ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Đang nghe... bấm để chấm điểm</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>{voiceScore && !voiceScore.passed ? 'Bấm mic đọc lại từ này' : 'Bấm mic đọc to chữ Hán này'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 4 NÚT ĐÁNH GIÁ THEO SM-2: BẤM VÀO LƯU NGẦM VÀ QUA CÂU NGAY 0ms */}
            {isFlipped && (
              <div className="space-y-2 p-3 bg-white rounded-2xl border border-stone-200 animate-fade-in">
                <div className="text-[11px] font-bold text-stone-500 text-center uppercase tracking-wider">
                  Bạn nhớ từ này thế nào? (Bấm để qua câu tiếp)
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {/* 1. Quên */}
                  <button
                    type="button"
                    onClick={() => handleRateCard('again')}
                    className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-center active:scale-95 transition-all"
                  >
                    <div className="text-xs font-black text-red-600">Quên</div>
                    <div className="text-[10px] text-red-500 mt-0.5">{estimatedIntervals?.again || 'Ngày mai'}</div>
                  </button>

                  {/* 2. Khó */}
                  <button
                    type="button"
                    onClick={() => handleRateCard('hard')}
                    className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-center active:scale-95 transition-all"
                  >
                    <div className="text-xs font-black text-amber-600">Khó</div>
                    <div className="text-[10px] text-amber-500 mt-0.5">{estimatedIntervals?.hard || '2 ngày'}</div>
                  </button>

                  {/* 3. Tốt */}
                  <button
                    type="button"
                    onClick={() => handleRateCard('good')}
                    className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-center active:scale-95 transition-all"
                  >
                    <div className="text-xs font-black text-blue-600">Tốt</div>
                    <div className="text-[10px] text-blue-500 mt-0.5">{estimatedIntervals?.good || '3 ngày'}</div>
                  </button>

                  {/* 4. Dễ */}
                  <button
                    type="button"
                    onClick={() => handleRateCard('easy')}
                    className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-center active:scale-95 transition-all"
                  >
                    <div className="text-xs font-black text-emerald-600">Dễ</div>
                    <div className="text-[10px] text-emerald-500 mt-0.5">{estimatedIntervals?.easy || '5 ngày'}</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MÀN HÌNH TỔNG KẾT BUỔI HỌC FLASHCARD */}
      {/* ============================================================== */}
      {isSessionFinished && (
        <div className="text-center py-6 animate-fade-in space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-xs">
            🎉
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900 mb-1">Hoàn thành buổi ôn tập!</h2>
            <p className="text-xs text-stone-500">
              Bạn đã ôn luyện xong các thẻ trong lượt này. Trí nhớ dài hạn đã được củng cố!
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 text-xs">
              <span className="text-stone-500">Số thẻ đã hoàn thành:</span>
              <span className="font-bold text-stone-900">{sessionCompletedCount} thẻ</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">Lịch ôn tập tiếp theo:</span>
              <span className="font-bold text-emerald-700">Tự động tính theo thuật toán SM-2</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => startSession(0)}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ôn tập lại từ đầu</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSessionFinished(false)}
              className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl font-semibold text-xs transition-colors"
            >
              Quay lại danh mục
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

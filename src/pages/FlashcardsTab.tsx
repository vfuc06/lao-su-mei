import React, { useState, useEffect, useRef } from 'react';
import { VocabCard, UserCardProgress, ScoreOutput } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calculateSM2, getEstimatedIntervals, CardRating } from '../lib/sm2';
import { evaluatePronunciation } from '../lib/scoring';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ZhText } from '../components/ZhText';
import { ScoreRing } from '../components/ScoreRing';
import { SyllableDiff } from '../components/SyllableDiff';
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
  AlertCircle,
  Briefcase,
  BookOpen,
  Calendar,
  Check,
  TrendingUp,
  Award,
  ChevronRight,
  Loader2,
  X,
  RefreshCw,
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

  // Dữ liệu thẻ và tiến trình
  const [allCards, setAllCards] = useState<CardWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);

  const currentCard = studyQueue[currentIndex];

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
    setIsLoading(true);
    let cards: VocabCard[] = [];
    const progressMap = new Map<number, UserCardProgress>();

    if (isSupabaseConfigured) {
      // 1. Tải danh sách thẻ
      const { data: cardsData } = await supabase
        .from('vocab_cards')
        .select('*')
        .order('sort', { ascending: true });

      if (cardsData) {
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

    // Fallback cho chế độ khách (localStorage)
    if (!user && typeof window !== 'undefined') {
      try {
        const localProg = JSON.parse(localStorage.getItem('webchinese_card_progress') || '{}');
        Object.keys(localProg).forEach((cardIdStr) => {
          const cardId = Number(cardIdStr);
          progressMap.set(cardId, localProg[cardIdStr]);
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

  // Phân loại thẻ: Đến hạn (due) vs Thẻ mới (new)
  const now = new Date();
  const dueCards = filteredCards.filter(
    (c) => c.progress && new Date(c.progress.dueAt) <= now
  );
  const newCards = filteredCards.filter((c) => !c.progress);
  const masteredCards = filteredCards.filter(
    (c) => c.progress && c.progress.repetitions >= 3
  );

  // Số lượng thẻ mới giới hạn theo cài đặt
  const dailyLimit = settings.dailyNewCards || 10;
  const newCardsForToday = newCards.slice(0, dailyLimit);
  const totalCardsToStudy = dueCards.length + newCardsForToday.length;

  // Bắt đầu buổi học
  const startSession = () => {
    const queue = [...dueCards, ...newCardsForToday];
    if (queue.length === 0) {
      // Nếu đã ôn hết, cho phép ôn lại 10 thẻ bất kỳ
      const practiceMore = filteredCards.slice(0, 10);
      if (practiceMore.length === 0) {
        alert('Chưa có thẻ nào trong bộ này.');
        return;
      }
      setStudyQueue(practiceMore);
    } else {
      setStudyQueue(queue);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsStudying(true);
    setIsSessionFinished(false);
    setSessionCompletedCount(0);
    setHeardText('');
    setVoiceScore(null);
  };

  // Đọc phát âm Hán tự qua Web SpeechSynthesis
  const speakHanzi = (text: string, rate: number = 1.0) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  // Chấm điểm phát âm ở chế độ Đọc to
  const handleEvaluateVoice = (spokenText: string, card: CardWithProgress) => {
    const res = evaluatePronunciation(card.hanzi, spokenText, [], settings.passThreshold || 80);
    setVoiceScore(res);

    if (res.passed) {
      setIsFlipped(true);
      // Tự động đánh giá Good sau 1.8 giây nếu người dùng không bấm nút khác
      const timer = setTimeout(() => {
        handleRateCard('good');
      }, 1800);
      setAutoAdvanceTimer(timer);
    }
  };

  // Đánh giá thẻ (Again, Hard, Good, Easy) theo SM-2
  const handleRateCard = async (rating: CardRating) => {
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

    // Cập nhật state nội bộ
    setAllCards((prev) =>
      prev.map((c) => (c.id === currentCard.id ? { ...c, progress: newProgress } : c))
    );

    // Lưu vào Supabase hoặc LocalStorage
    if (user && isSupabaseConfigured) {
      try {
        await supabase.from('user_card_progress').upsert({
          user_id: user.id,
          card_id: currentCard.id,
          ease: newProgress.ease,
          interval_days: newProgress.intervalDays,
          repetitions: newProgress.repetitions,
          lapses: newProgress.lapses,
          due_at: newProgress.dueAt,
          last_reviewed_at: newProgress.lastReviewedAt,
        });

        // Tăng daily_activity.cards_reviewed
        const todayVn = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
        try {
          await supabase.rpc('increment_daily_activity', {
            p_user_id: user.id,
            p_day: todayVn,
            p_column: 'cards_reviewed',
          });
        } catch {
          await supabase.from('daily_activity').upsert({
            user_id: user.id,
            day: todayVn,
            cards_reviewed: 1,
          });
        }
      } catch (err) {
        console.error('Lỗi lưu tiến trình thẻ:', err);
      }
    } else if (typeof window !== 'undefined') {
      try {
        const localProg = JSON.parse(localStorage.getItem('webchinese_card_progress') || '{}');
        localProg[currentCard.id] = newProgress;
        localStorage.setItem('webchinese_card_progress', JSON.stringify(localProg));
      } catch (e) {}
    }

    // Nếu đánh giá 'again' (quên), đưa thẻ về cuối hàng đợi để ôn lại ngay trong phiên
    if (rating === 'again') {
      setStudyQueue((prev) => [...prev, currentCard]);
    }

    setSessionCompletedCount((prev) => prev + 1);

    // Sang thẻ tiếp theo
    if (currentIndex + 1 < studyQueue.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setHeardText('');
      setVoiceScore(null);
    } else {
      setIsSessionFinished(true);
      setIsStudying(false);
    }
  };

  const estimatedIntervals = currentCard ? getEstimatedIntervals(currentCard.progress) : null;

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-fade-in">
      {/* ============================================================== */}
      {/* 1. MÀN HÌNH CHÍNH (DANH SÁCH & BẮT ĐẦU ÔN) */}
      {/* ============================================================== */}
      {!isStudying && !isSessionFinished && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <span>🗂</span>
                <span>Từ vựng Flashcard</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Ôn ngắt quãng SM-2 · Nhớ lâu hơn gấp 3 lần
              </p>
            </div>
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shadow-2xs">
              SM2
            </div>
          </div>

          {/* Công tắc chọn bộ thẻ: [ HSK 1–4 ] [ Công sở ] */}
          <div className="p-1 bg-stone-200/70 rounded-2xl flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveDeck('hsk');
                setSelectedHskLevel('all');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeDeck === 'hsk'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-red-600" />
              <span>Giao tiếp HSK 1–4</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveDeck('workplace');
                setSelectedCategory('all');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeDeck === 'workplace'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-red-600" />
              <span>Từ vựng Công sở</span>
            </button>
          </div>

          {/* Bộ lọc phụ: Cấp độ HSK hoặc Chuyên mục Công sở */}
          {activeDeck === 'hsk' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
              {['all', 1, 2, 3, 4].map((lvl) => (
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

          {/* Thẻ thống kê tổng quan */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-2xs space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-red-50/70 rounded-2xl border border-red-100">
                <div className="text-xl font-black text-red-600">{dueCards.length}</div>
                <div className="text-[11px] font-bold text-red-900 mt-0.5">Cần ôn</div>
                <div className="text-[10px] text-red-600/80">đến hạn hôm nay</div>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100">
                <div className="text-xl font-black text-amber-600">{newCardsForToday.length}</div>
                <div className="text-[11px] font-bold text-amber-900 mt-0.5">Thẻ mới</div>
                <div className="text-[10px] text-amber-600/80">giới hạn {dailyLimit}/ngày</div>
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

            {/* Nút bắt đầu buổi học */}
            <button
              type="button"
              onClick={startSession}
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
                  <span>Bắt đầu ôn tập ({totalCardsToStudy > 0 ? `${totalCardsToStudy} thẻ` : 'Ôn tự do'})</span>
                </>
              )}
            </button>
          </div>

          {/* Danh sách xem nhanh thẻ trong bộ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Danh sách thẻ trong bộ ({filteredCards.length} từ):
              </span>
              <span className="text-[11px] text-stone-400">Chạm để nghe thử</span>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200/90 divide-y divide-stone-100 shadow-2xs overflow-hidden">
              {filteredCards.slice(0, 8).map((card) => (
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
                      <div className="flex items-center gap-2">
                        <span className="font-black text-stone-900 text-base">{card.hanzi}</span>
                        <span className="text-xs text-stone-500 font-mono">[{card.pinyin}]</span>
                      </div>
                      <div className="text-xs text-stone-600 truncate mt-0.5">{card.vi}</div>
                    </div>
                  </div>

                  {card.progress ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {card.progress.intervalDays} ngày
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                      Chưa học
                    </span>
                  )}
                </div>
              ))}

              {filteredCards.length > 8 && (
                <div className="p-3 text-center text-xs text-stone-500 font-medium bg-stone-50/50">
                  Và còn {filteredCards.length - 8} thẻ từ vựng khác trong bộ này...
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
                if (confirm('Bạn có chắc muốn tạm dừng buổi ôn tập này không?')) {
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

          {/* KHỐI THẺ FLASHCARD CHÍNH */}
          <div className="bg-white rounded-3xl border-2 border-stone-200/90 shadow-md p-6 min-h-[360px] flex flex-col justify-between relative transition-all">
            {/* Phía trên thẻ: Nút nghe phát âm */}
            <div className="flex items-center justify-between w-full">
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

            {/* MẶT TRƯỚC: CHỮ HÁN TO ≥ 36PX */}
            <div className="my-auto text-center py-6">
              <div className="text-5xl font-black text-stone-900 tracking-wide font-sans mb-3">
                {currentCard.hanzi}
              </div>

              {/* Nếu đã lật: Hiện pinyin và nghĩa Việt */}
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
                    <div className="mt-4 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-left">
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
                <div className="text-xs text-stone-400 mt-2">
                  {studyMode === 'flip'
                    ? 'Chạm nút bên dưới hoặc lật thẻ để xem pinyin & nghĩa'
                    : 'Bấm mic đọc to chữ Hán trên để kiểm tra'}
                </div>
              )}
            </div>

            {/* PHẦN ĐIỀU KHIỂN & CHẤM ĐIỂM (TÙY THEO CHẾ ĐỘ VÀ TRẠNG THÁI LẬT) */}
            <div className="pt-4 border-t border-stone-100">
              {!isFlipped ? (
                studyMode === 'flip' ? (
                  // Chế độ Lật thẻ: Nút lật to
                  <button
                    type="button"
                    onClick={() => setIsFlipped(true)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Lật thẻ xem đáp án</span>
                  </button>
                ) : (
                  // Chế độ Đọc to: Nút mic & Chấm điểm
                  <div className="space-y-3">
                    {voiceScore && (
                      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-stone-700">
                            Bạn đã đọc: <span className="text-stone-900">{heardText || '(chưa nghe rõ)'}</span>
                          </div>
                          <div className="mt-1">
                            <SyllableDiff perSyllable={voiceScore.perSyllable} extra={voiceScore.extra} />
                          </div>
                        </div>
                        <ScoreRing score={voiceScore.score} size="sm" />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => (isListening ? stopListening() : startListening())}
                        className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 ${
                          isListening
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20'
                        }`}
                      >
                        {isListening ? (
                          <>
                            <Square className="w-4 h-4 fill-white" />
                            <span>Đang nghe... bấm để dừng</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4" />
                            <span>Bấm mic & Đọc to</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsFlipped(true)}
                        className="py-3.5 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
                        title="Bỏ qua và xem đáp án"
                      >
                        Xem đáp án
                      </button>
                    </div>
                  </div>
                )
              ) : (
                // ĐÃ LẬT: 4 NÚT ĐÁNH GIÁ THEO SM-2
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-stone-500 text-center uppercase tracking-wider">
                    Bạn nhớ từ này thế nào?
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {/* 1. Quên (Again) */}
                    <button
                      type="button"
                      onClick={() => handleRateCard('again')}
                      className="p-2.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-center active:scale-95 transition-all"
                    >
                      <div className="text-sm font-black text-red-600">Quên</div>
                      <div className="text-[10px] text-red-500 mt-0.5">
                        {estimatedIntervals?.again || '1 ngày'}
                      </div>
                    </button>

                    {/* 2. Khó (Hard) */}
                    <button
                      type="button"
                      onClick={() => handleRateCard('hard')}
                      className="p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-center active:scale-95 transition-all"
                    >
                      <div className="text-sm font-black text-amber-600">Khó</div>
                      <div className="text-[10px] text-amber-500 mt-0.5">
                        {estimatedIntervals?.hard || '3 ngày'}
                      </div>
                    </button>

                    {/* 3. Tốt (Good) */}
                    <button
                      type="button"
                      onClick={() => handleRateCard('good')}
                      className="p-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-center active:scale-95 transition-all"
                    >
                      <div className="text-sm font-black text-blue-600">Tốt</div>
                      <div className="text-[10px] text-blue-500 mt-0.5">
                        {estimatedIntervals?.good || '6 ngày'}
                      </div>
                    </button>

                    {/* 4. Dễ (Easy) */}
                    <button
                      type="button"
                      onClick={() => handleRateCard('easy')}
                      className="p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-center active:scale-95 transition-all"
                    >
                      <div className="text-sm font-black text-emerald-600">Dễ</div>
                      <div className="text-[10px] text-emerald-500 mt-0.5">
                        {estimatedIntervals?.easy || '8+ ngày'}
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MÀN HÌNH TỔNG KẾT PHIÊN HỌC (SESSION FINISHED) */}
      {/* ============================================================== */}
      {isSessionFinished && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm text-center space-y-4 animate-scale-up">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-black text-stone-900">Hoàn thành buổi ôn!</h3>
            <p className="text-xs text-stone-500 mt-1">
              Bạn đã ôn tập xong {sessionCompletedCount} lượt từ vựng hôm nay.
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70 text-xs text-stone-600 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="font-bold">Tổng lượt thẻ đã ôn:</span>
              <span className="font-black text-stone-900">{sessionCompletedCount} thẻ</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold">Thuật toán SM-2:</span>
              <span className="text-emerald-600 font-bold">Đã tự động tính lịch ôn kế tiếp</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsSessionFinished(false);
                fetchCardsAndProgress();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 active:scale-98 transition-all"
            >
              Quay lại danh sách từ vựng
            </button>

            <button
              type="button"
              onClick={startSession}
              className="w-full py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs active:scale-98 transition-all"
            >
              Ôn thêm một phiên nữa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

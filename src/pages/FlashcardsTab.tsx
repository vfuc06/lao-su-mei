import React, { useState, useEffect } from 'react';
import { VocabCard, ScoreOutput } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { evaluatePronunciation } from '../lib/scoring';
import { getTipForSyllable } from '../lib/pronunciationTips';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ZhText } from '../components/ZhText';
import { ScoreRing } from '../components/ScoreRing';
import { SyllableDiff } from '../components/SyllableDiff';
import { playZhAudio } from '../lib/audio';
import { INITIAL_VOCAB_CARDS } from '../lib/initialData';
import {
  Volume2,
  Turtle,
  RotateCcw,
  Mic,
  Square,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  BookOpen,
  Loader2,
  X,
  Play,
  Check,
} from 'lucide-react';

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

  // Danh sách từ vựng
  const [allCards, setAllCards] = useState<VocabCard[]>(INITIAL_VOCAB_CARDS);
  const [isLoading, setIsLoading] = useState(false);

  // Phân đoạn hiển thị 30 từ một lần (chống lag máy khi CSDL có nhiều nghìn từ)
  const [visibleCount, setVisibleCount] = useState<number>(30);

  // Buổi học hiện tại
  const [isStudying, setIsStudying] = useState(false);
  const [studyQueue, setStudyQueue] = useState<VocabCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSessionFinished, setIsSessionFinished] = useState(false);
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);

  // Trạng thái mic & chấm điểm cho chế độ Đọc to
  const [heardText, setHeardText] = useState('');
  const [voiceScore, setVoiceScore] = useState<ScoreOutput | null>(null);
  const [activeVoiceTip, setActiveVoiceTip] = useState<string | null>(null);

  // Lưu vết học tới đâu học tiếp
  const sessionSaveKey = `lao_su_mei_fc_pos_${activeDeck}_${selectedHskLevel}_${selectedCategory}`;
  const [savedSessionIndex, setSavedSessionIndex] = useState<number | null>(null);

  // Đọc lại vị trí đã học dở khi đổi bộ lọc
  useEffect(() => {
    try {
      const raw = localStorage.getItem(sessionSaveKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.index === 'number' && parsed.index >= 0) {
          setSavedSessionIndex(parsed.index);
          return;
        }
      }
    } catch (e) {}
    setSavedSessionIndex(null);
    setVisibleCount(30);
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

  // Tải danh sách thẻ từ Database (nếu có bổ sung từ mới)
  const fetchCards = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: cardsData } = await supabase
        .from('vocab_cards')
        .select('*')
        .order('sort', { ascending: true });

      if (cardsData && cardsData.length > 0) {
        setAllCards(
          cardsData.map((c: any) => ({
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
          }))
        );
      }
    } catch (err) {
      console.warn('Lỗi tải thẻ từ Supabase, dùng dữ liệu sẵn có:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [user?.id]);

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

  // Bắt đầu buổi học: Học theo thứ tự từ vị trí đã lưu
  const startSession = (resumeFromIndex: number = 0) => {
    if (filteredCards.length === 0) {
      alert('Chưa có thẻ nào trong bộ này.');
      return;
    }

    setStudyQueue(filteredCards);
    const safeIndex = Math.min(resumeFromIndex, Math.max(0, filteredCards.length - 1));
    setCurrentIndex(safeIndex);
    setIsFlipped(false);
    setIsStudying(true);
    setIsSessionFinished(false);
    setSessionCompletedCount(safeIndex);
    setHeardText('');
    setVoiceScore(null);
    setActiveVoiceTip(null);

    // Lưu vị trí hiện tại
    try {
      localStorage.setItem(
        sessionSaveKey,
        JSON.stringify({ index: safeIndex, total: filteredCards.length, time: Date.now() })
      );
      setSavedSessionIndex(safeIndex);
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

  // Chuyển thẻ tiếp theo
  const handleNextCard = () => {
    if (currentIndex + 1 < studyQueue.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setIsFlipped(false);
      setHeardText('');
      setVoiceScore(null);
      setActiveVoiceTip(null);
      setSessionCompletedCount((prev) => Math.max(prev, nextIdx));

      // Lưu lại vị trí để lần sau vào học tiếp
      try {
        localStorage.setItem(
          sessionSaveKey,
          JSON.stringify({ index: nextIdx, total: studyQueue.length, time: Date.now() })
        );
        setSavedSessionIndex(nextIdx);
      } catch (e) {}

      // Đồng bộ tiến trình thẻ đã học vào Supabase nếu đã đăng nhập
      if (user && isSupabaseConfigured && currentCard) {
        (async () => {
          try {
            await supabase.from('user_card_progress').upsert({
              user_id: user.id,
              card_id: currentCard.id,
              ease: 2.5,
              interval_days: 1,
              repetitions: 1,
              due_at: new Date().toISOString(),
              last_reviewed_at: new Date().toISOString(),
            });
          } catch (e) {}
        })();
      }
    } else {
      setIsSessionFinished(true);
      setIsStudying(false);
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
    }
  };

  // Chấm điểm phát âm ở chế độ Đọc to
  const handleEvaluateVoice = (spokenText: string, card: VocabCard) => {
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
    }
  };

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
                Học từ vựng tiếng Trung · Ghi nhớ liên tục · Lưu vết học tới đâu học tiếp
              </p>
            </div>
          </div>

          {/* Chọn nguồn thẻ: HSK 1-4 vs Công sở */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveDeck('hsk')}
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
              onClick={() => setActiveDeck('workplace')}
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

          {/* Thẻ trạng thái học tập (Đơn giản, rõ ràng) */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-2xs space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-red-50/70 rounded-2xl border border-red-100">
                <div className="text-2xl font-black text-red-600">{filteredCards.length}</div>
                <div className="text-xs font-bold text-red-900 mt-0.5">Tổng số từ</div>
                <div className="text-[10px] text-red-600/80">trong bộ này</div>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100">
                <div className="text-2xl font-black text-amber-600">
                  {savedSessionIndex !== null ? savedSessionIndex + 1 : 1}
                </div>
                <div className="text-xs font-bold text-amber-900 mt-0.5">Vị trí hiện tại</div>
                <div className="text-[10px] text-amber-600/80">đã lưu tự động</div>
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
                    Bấm mic đọc to, AI chấm điểm chuẩn từng âm.
                  </div>
                </button>
              </div>
            </div>

            {/* Các nút Bắt đầu / Học tiếp */}
            <div className="space-y-2 pt-1">
              {savedSessionIndex !== null && savedSessionIndex > 0 && savedSessionIndex < filteredCards.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => startSession(savedSessionIndex)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Học tiếp từ thẻ {savedSessionIndex + 1} / {filteredCards.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startSession(0)}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors text-center"
                  >
                    Học lại từ thẻ đầu tiên
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => startSession(0)}
                  disabled={isLoading || filteredCards.length === 0}
                  className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang chuẩn bị...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Bắt đầu học ({filteredCards.length} thẻ)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* DANH SÁCH XEM NHANH (PHÂN ĐOẠN 30 TỪ ĐỂ KHÔNG BỊ LAG) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Danh sách từ trong bộ ({filteredCards.length} từ):
              </span>
              <span className="text-[11px] text-stone-400">Chạm để nghe thử</span>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200/90 divide-y divide-stone-100 shadow-2xs overflow-hidden">
              {filteredCards.slice(0, visibleCount).map((card, idx) => {
                const isPassed = savedSessionIndex !== null && idx < savedSessionIndex;
                return (
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

                    {isPassed && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Đã học</span>
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Tải thêm 30 từ khi lướt xuống */}
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
      {/* 2. MÀN HÌNH ĐANG HỌC THẺ (FLASHCARD SESSION) */}
      {/* ============================================================== */}
      {isStudying && currentCard && (
        <div className="space-y-4">
          {/* Thanh điều hướng trên cùng của phiên */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <button
              type="button"
              onClick={() => {
                setIsStudying(false);
              }}
              className="p-1.5 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Thoát phiên ôn"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <span>Thẻ</span>
              <span className="text-red-600 font-extrabold">{currentIndex + 1}</span>
              <span>/</span>
              <span>{studyQueue.length}</span>
            </div>

            <div className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {studyMode === 'flip' ? '🎴 Lật thẻ' : '🎙️ Đọc to'}
            </div>
          </div>

          {/* Thanh tiến trình */}
          <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-red-600 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / studyQueue.length) * 100}%` }}
            />
          </div>

          {/* KHỐI THẺ FLASHCARD CHÍNH (CHẠM ĐỂ LẬT TRƯỚC / SAU) */}
          <div
            onClick={toggleFlip}
            className="bg-white rounded-3xl border-2 border-stone-200/90 shadow-md p-6 min-h-[360px] flex flex-col justify-between relative transition-all active:scale-[0.99] cursor-pointer select-none hover:border-red-300"
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

          {/* ĐIỀU HƯỚNG TIẾN / LÙI (RÕ RÀNG, ĐƠN GIẢN, KHÔNG RƯỜM RÀ) */}
          <div className="space-y-3">
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
              Bạn đã ôn luyện xong danh sách từ trong lượt này. Rất xuất sắc!
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 text-xs">
              <span className="text-stone-500">Tổng số thẻ đã học:</span>
              <span className="font-bold text-stone-900">{sessionCompletedCount} thẻ</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">Tiến trình:</span>
              <span className="font-bold text-emerald-700">Đã lưu tự động</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => startSession(0)}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Học lại từ đầu</span>
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

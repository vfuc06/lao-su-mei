import React, { useState, useEffect } from 'react';
import { pinyin } from 'pinyin-pro';
import { PhraseGroup, PhrasePair, ScoreOutput } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { evaluatePronunciation } from '../lib/scoring';
import { getTipForSyllable } from '../lib/pronunciationTips';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ScoreRing } from '../components/ScoreRing';
import { SyllableDiff } from '../components/SyllableDiff';
import { playZhAudio } from '../lib/audio';
import { INITIAL_PHRASE_GROUPS, INITIAL_PHRASE_PAIRS } from '../lib/initialData';
import {
  Headphones,
  Volume2,
  Turtle,
  RotateCcw,
  Mic,
  ArrowRight,
  ArrowLeft,
  EyeOff,
  Type,
  Coffee,
  Briefcase,
  Square,
  Sparkles,
} from 'lucide-react';

interface ShadowingTabProps {
  initialPhrase?: { q?: string; a: string };
}

export const ShadowingTab: React.FC<ShadowingTabProps> = ({ initialPhrase }) => {
  const { user, settings } = useAuth();

  // Nguồn bài luyện: 2 nhóm chính Đời sống (8 nhóm) & Công sở (6 nhóm)
  const [sourceType, setSourceType] = useState<'daily' | 'workplace'>('daily');
  const [selectedGroup, setSelectedGroup] = useState<PhraseGroup | null>(null);
  const [practiceQueue, setPracticeQueue] = useState<PhrasePair[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isSummaryActive, setIsSummaryActive] = useState<boolean>(false);

  // Cài đặt hiển thị trong lúc luyện
  const [hidePinyin, setHidePinyin] = useState(false);
  const [hideHanzi, setHideHanzi] = useState(false);

  // Trạng thái chấm điểm
  const [lastScore, setLastScore] = useState<ScoreOutput | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [heardText, setHeardText] = useState<string>('');
  const [activeTip, setActiveTip] = useState<string | null>(null);

  // Hook nhận diện giọng nói
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: 'zh-CN',
    onResult: (spokenText) => {
      setHeardText(spokenText);
      handleGrade(spokenText);
    },
  });

  // Đếm số lượng câu mẫu trong mỗi nhóm (tính tức thì 0ms từ bộ nạp sẵn)
  const getGroupCount = (group: PhraseGroup) => {
    const matched = INITIAL_PHRASE_PAIRS.filter(
      (p) => p.slug === group.slug || p.groupId === group.id
    );
    return matched.length > 0 ? matched.length : 8;
  };

  // Nếu được truyền một câu cụ thể để luyện (từ tab Mẫu câu)
  useEffect(() => {
    if (initialPhrase?.a) {
      const qHanzi = initialPhrase.q || '请读出以下句子：';
      const qPinyin = pinyin(qHanzi);
      const aHanzi = initialPhrase.a;
      const aPinyin = pinyin(aHanzi);
      setPracticeQueue([
        {
          id: 999999,
          groupId: 0,
          sort: 1,
          qHanzi,
          qPinyin,
          qVi: initialPhrase.q ? 'Câu hỏi / ngữ cảnh' : 'Hãy đọc to câu sau:',
          aHanzi,
          aPinyin,
          aVi: '',
        },
      ]);
      setCurrentIndex(0);
      setLastScore(null);
      setAttemptCount(0);
      setHeardText('');
      setIsSessionActive(true);
      setIsSummaryActive(false);
    }
  }, [initialPhrase]);

  // Bắt đầu buổi luyện tập nhại lại câu mẫu
  const handleStartPractice = (group: PhraseGroup) => {
    setSelectedGroup(group);

    // Ưu tiên lấy ngay lập tức từ bộ nạp sẵn (0ms)
    const localMatches = INITIAL_PHRASE_PAIRS.filter(
      (p) => p.slug === group.slug || p.groupId === group.id
    );

    const items: PhrasePair[] = localMatches.length > 0 ? localMatches : [];

    if (items.length === 0) {
      alert('Không có câu nào trong nhóm này!');
      return;
    }

    setPracticeQueue(items);
    setCurrentIndex(0);
    setLastScore(null);
    setAttemptCount(0);
    setHeardText('');
    setActiveTip(null);
    setIsSessionActive(true);
    setIsSummaryActive(false);

    // Phát âm câu mẫu đầu tiên sau 350ms
    setTimeout(() => {
      if (items[0]) {
        playZhAudio(items[0].aHanzi, settings.speechRate || 1.0);
      }
    }, 350);

    // Đồng bộ thêm câu mới từ Supabase ở chế độ chạy ngầm nếu có
    if (isSupabaseConfigured) {
      (async () => {
        try {
          const { data } = await supabase
            .from('phrase_pairs')
            .select('*')
            .eq('group_id', group.id)
            .order('sort', { ascending: true });

          if (data && data.length > items.length) {
            setPracticeQueue(
              data.map((p: any) => ({
                id: p.id,
                groupId: p.group_id,
                sort: p.sort,
                qHanzi: p.q_hanzi,
                qPinyin: p.q_pinyin,
                qVi: p.q_vi,
                aHanzi: p.a_hanzi,
                aPinyin: p.a_pinyin,
                aVi: p.a_vi,
                noteVi: p.note_vi,
              }))
            );
          }
        } catch (e) {}
      })();
    }
  };

  const currentItem = practiceQueue[currentIndex];

  // Phát âm câu mẫu
  const playPromptAudio = (rateMultiplier: number = 1.0) => {
    if (!currentItem) return;
    playZhAudio(currentItem.aHanzi, (settings.speechRate || 1.0) * rateMultiplier);
  };

  // Chấm điểm âm tiết
  const handleGrade = (spoken: string) => {
    if (!currentItem) return;

    const targetHanzi = currentItem.aHanzi;
    const result = evaluatePronunciation(targetHanzi, spoken, [], settings.passThreshold || 80);

    setLastScore(result);
    setAttemptCount((prev) => prev + 1);

    // Mẹo thanh điệu khi sai
    const failedSyllable = result.perSyllable.find((s) => s.status !== 'ok');
    if (failedSyllable) {
      setActiveTip(getTipForSyllable(failedSyllable.target));
    } else {
      setActiveTip(null);
    }

    // Lưu ngầm tiến trình (không block UI)
    if (user && isSupabaseConfigured) {
      (async () => {
        try {
          await supabase.from('user_phrase_progress').upsert({
            user_id: user.id,
            pair_id: currentItem.id,
            best_score: Math.max(result.score, currentItem.bestScore || 0),
            attempts: (currentItem.attempts || 0) + 1,
            passed: result.passed || currentItem.passed,
            last_practiced_at: new Date().toISOString(),
          });

          const todayVn = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
          await supabase.rpc('increment_daily_activity', {
            p_user_id: user.id,
            p_day: todayVn,
            p_column: 'shadowing_done',
          });
        } catch (e) {}
      })();
    }
  };

  // Chuyển sang câu tiếp theo
  const handleNextQuestion = () => {
    if (currentIndex + 1 < practiceQueue.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setLastScore(null);
      setAttemptCount(0);
      setHeardText('');
      setActiveTip(null);
      setTimeout(() => {
        if (practiceQueue[nextIdx]) {
          playZhAudio(practiceQueue[nextIdx].aHanzi, settings.speechRate || 1.0);
        }
      }, 300);
    } else {
      setIsSummaryActive(true);
    }
  };

  // Quay lại câu trước đó
  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setLastScore(null);
      setAttemptCount(0);
      setHeardText('');
      setActiveTip(null);
    }
  };

  const handleToggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      setLastScore(null);
      startListening();
    }
  };

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto animate-fade-in">
      {!isSessionActive ? (
        // ==============================================================
        // MÀN HÌNH 1: DANH SÁCH NHÓM CÂU ĐỂ LUYỆN SHADOWING (100% NHẠI LẠI)
        // ==============================================================
        <div>
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2.5">
              <Headphones className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-stone-900">Luyện nói Shadowing</h2>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1 leading-relaxed">
              Nghe câu mẫu ➔ Nhại lại phát âm ➔ Chấm điểm từng âm tiết xanh/cam/đỏ ➔ Hoàn thiện giọng nói chuẩn!
            </p>
          </div>

          {/* Chọn nguồn: Đời sống (8 nhóm) vs Công sở (6 nhóm) */}
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSourceType('daily')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  sourceType === 'daily'
                    ? 'border-red-500 bg-red-50 text-red-700 shadow-2xs ring-1 ring-red-500/20'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Coffee className="w-4 h-4 text-red-600" />
                <span>Mẫu câu Đời sống (8)</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('workplace')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  sourceType === 'workplace'
                    ? 'border-red-500 bg-red-50 text-red-700 shadow-2xs ring-1 ring-red-500/20'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Briefcase className="w-4 h-4 text-red-600" />
                <span>Mẫu câu Công sở (6)</span>
              </button>
            </div>
          </div>

          {/* Danh sách các nhóm câu nạp sẵn tức thì 0ms */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider px-1">
              Chọn nhóm câu muốn luyện:
            </div>

            {INITIAL_PHRASE_GROUPS.filter((g) => g.kind === sourceType).map((group) => {
              const count = getGroupCount(group);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleStartPractice(group)}
                  className="w-full p-4 bg-white hover:bg-red-50/40 border border-stone-200 rounded-2xl flex items-center justify-between text-left shadow-2xs active:scale-[0.99] transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl">{group.emoji}</span>
                    <div>
                      <div className="font-bold text-sm text-stone-900 group-hover:text-red-600 transition-colors">
                        {group.titleVi}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {count} câu mẫu nhại lại
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1 group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <span>Luyện nói</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : isSummaryActive ? (
        // ==============================================================
        // MÀN HÌNH 2: TỔNG KẾT HOÀN THÀNH BÀI SHADOWING
        // ==============================================================
        <div className="text-center py-6 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 text-3xl shadow-xs">
            🎉
          </div>
          <h2 className="text-xl font-black text-stone-900 mb-1">Hoàn thành bài Shadowing!</h2>
          <p className="text-xs text-stone-500 mb-6">Bạn đã kiên trì luyện tập hết danh sách câu mẫu.</p>

          <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs mb-6 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 text-xs">
              <span className="text-stone-500">Chủ đề vừa luyện:</span>
              <span className="font-bold text-stone-900">{selectedGroup?.titleVi || 'Mẫu câu'}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 text-xs">
              <span className="text-stone-500">Tổng số câu đã qua:</span>
              <span className="font-bold text-stone-900">{practiceQueue.length} câu</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">Ngưỡng điểm đạt:</span>
              <span className="font-bold text-emerald-700">≥ {settings.passThreshold || 80}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                if (selectedGroup) {
                  handleStartPractice(selectedGroup);
                } else {
                  setIsSessionActive(false);
                }
              }}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Luyện lại bài này</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSessionActive(false)}
              className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl font-semibold text-xs transition-colors"
            >
              Chọn chủ đề khác
            </button>
          </div>
        </div>
      ) : (
        // ==============================================================
        // MÀN HÌNH 3: PHIÊN LUYỆN TẬP NHẠI LẠI TỪNG CÂU
        // ==============================================================
        currentItem && (
          <div className="space-y-4">
            {/* Header thanh điều hướng */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <button
                type="button"
                onClick={() => setIsSessionActive(false)}
                className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900 py-1 px-2 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Thoát</span>
              </button>

              <div className="text-xs font-bold text-stone-900">
                Câu {currentIndex + 1} / {practiceQueue.length}
              </div>

              {/* Công tắc ẩn/hiện Pinyin và Chữ Hán */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setHidePinyin(!hidePinyin)}
                  className={`p-1.5 rounded-xl border text-[11px] font-bold ${
                    hidePinyin
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                  title="Ẩn/Hiện Pinyin"
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setHideHanzi(!hideHanzi)}
                  className={`p-1.5 rounded-xl border text-[11px] font-bold ${
                    hideHanzi
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                  title="Ẩn/Hiện Chữ Hán"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Thẻ câu mẫu nhại theo */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-2xs space-y-3">
              <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>🎧 CÂU MẪU NHẠI THEO:</span>
                {currentItem.qVi && (
                  <span className="text-stone-400 font-normal lowercase">{currentItem.qVi}</span>
                )}
              </div>

              <div className="space-y-1 py-1">
                {!hideHanzi && (
                  <div className="text-2xl font-black text-stone-900 tracking-wide font-sans">
                    {currentItem.aHanzi}
                  </div>
                )}
                {!hidePinyin && (
                  <div className="text-sm font-bold text-red-600 tracking-wide font-mono">
                    {currentItem.aPinyin}
                  </div>
                )}
                <div className="text-xs text-stone-600 italic">
                  "{currentItem.aVi}"
                </div>
              </div>

              {/* Nút nghe lại chuẩn và chậm */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => playPromptAudio(1.0)}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                >
                  <Volume2 className="w-4 h-4 text-stone-700" />
                  <span>Nghe mẫu</span>
                </button>

                <button
                  type="button"
                  onClick={() => playPromptAudio(0.75)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                >
                  <Turtle className="w-4 h-4 text-amber-600" />
                  <span>Nghe chậm</span>
                </button>
              </div>
            </div>

            {/* BẢNG KẾT QUẢ CHẤM ĐIỂM (sau khi đọc) */}
            {lastScore && (
              <div className="bg-white rounded-3xl p-4 border border-stone-200/90 shadow-sm space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ScoreRing score={lastScore.score} passThreshold={settings.passThreshold || 80} size="sm" />
                    <div>
                      <div className="font-extrabold text-sm text-stone-900">
                        {lastScore.passed ? '🎉 Tuyệt vời! Đã đạt.' : '💪 Chưa đạt, hãy thử lại!'}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Lần thử: {attemptCount} (Ngưỡng đạt: ≥ {settings.passThreshold || 80}%)
                      </div>
                    </div>
                  </div>

                  {lastScore.passed && (
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-transform"
                    >
                      <span>Câu tiếp</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Tô màu từng âm tiết */}
                <div className="pt-2 border-t border-stone-100">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                    Chi tiết từng âm tiết bạn phát âm:
                  </div>
                  <SyllableDiff perSyllable={lastScore.perSyllable} extra={lastScore.extra} />
                </div>

                {/* Mẹo thanh điệu khi sai */}
                {activeTip && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                    {activeTip}
                  </div>
                )}
              </div>
            )}

            {/* KHU VỰC THU ÂM & MIC BUTTON */}
            <div className="pt-1 flex flex-col items-center">
              {isListening && (
                <div className="mb-2.5 p-3 rounded-2xl bg-red-50 border border-red-200 text-center w-full animate-fade-in">
                  <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-0.5">
                    🎙️ Đang nghe... Hãy nhại lại câu mẫu
                  </div>
                  <div className="text-sm font-bold text-stone-900 min-h-[22px]">
                    {((transcript ? transcript + ' ' : '') + (interimTranscript || '')).trim() || 'Nói to rõ vào mic...'}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleToggleMic}
                className={`relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-200 active:scale-95 ${
                  isListening
                    ? 'bg-red-600 text-white shadow-red-300 shadow-xl scale-105'
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-md'
                }`}
              >
                {isListening ? (
                  <div className="flex flex-col items-center justify-center">
                    <Square className="w-6 h-6 fill-current mb-0.5" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Chấm ngay</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Mic className="w-8 h-8 mb-0.5" />
                    <span className="text-[9px] font-bold tracking-tight">Bấm nói</span>
                  </div>
                )}
              </button>

              <p className="text-[11px] font-semibold text-stone-500 mt-2 text-center">
                {isListening
                  ? 'Nói xong bấm lại nút để chấm điểm ngay'
                  : 'Bấm nút mic để nhại lại câu mẫu'}
              </p>
            </div>

            {/* THANH ĐIỀU HƯỚNG CHUYỂN CÂU (KHÔNG BAO GIỜ BỊ KẸT) */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevQuestion}
                disabled={currentIndex === 0}
                className="py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                title="Về câu trước"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="flex-1 py-3 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                title="Bỏ qua hoặc sang câu tiếp theo"
              >
                <span>{currentIndex + 1 === practiceQueue.length ? 'Hoàn thành bài' : 'Câu tiếp theo'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

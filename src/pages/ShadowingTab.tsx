import React, { useState, useEffect, useRef } from 'react';
import { pinyin } from 'pinyin-pro';
import { ConversationMode, PhraseGroup, PhrasePair, ScoreOutput } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { evaluatePronunciation } from '../lib/scoring';
import { getTipForSyllable } from '../lib/pronunciationTips';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ScoreRing } from '../components/ScoreRing';
import { SyllableDiff } from '../components/SyllableDiff';
import { ZhText } from '../components/ZhText';
import { playZhAudio } from '../lib/audio';
import {
  Headphones,
  Sparkles,
  Volume2,
  Turtle,
  RotateCcw,
  Mic,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Type,
  BookMarked,
  Star,
  Coffee,
  Briefcase,
  Loader2,
  Square,
} from 'lucide-react';

interface ShadowingTabProps {
  initialPhrase?: { q?: string; a: string };
}

export const ShadowingTab: React.FC<ShadowingTabProps> = ({ initialPhrase }) => {
  const { user, settings } = useAuth();

  // Trạng thái nguồn và chế độ
  const [sourceType, setSourceType] = useState<'daily' | 'workplace' | 'mistakes' | 'favorites'>('daily');
  const [mode, setMode] = useState<'mimic' | 'qa'>('mimic'); // Nhại lại vs Đối đáp
  const [groups, setGroups] = useState<PhraseGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<PhraseGroup | null>(null);
  const [practiceQueue, setPracticeQueue] = useState<PhrasePair[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isSummaryActive, setIsSummaryActive] = useState<boolean>(false);

  // Cài đặt hiển thị trong lúc luyện
  const [hidePinyin, setHidePinyin] = useState(false);
  const [hideHanzi, setHideHanzi] = useState(false);
  const [showAnswerInQA, setShowAnswerInQA] = useState(false);

  // Trạng thái chấm điểm lượt hiện tại
  const [lastScore, setLastScore] = useState<ScoreOutput | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [heardText, setHeardText] = useState<string>('');
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

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

  // Tải danh sách nhóm câu
  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoadingGroups(true);
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('phrase_groups')
          .select('*, phrase_pairs(count)')
          .order('sort', { ascending: true });

        if (data) {
          setGroups(
            data.map((g: any) => ({
              id: g.id,
              kind: g.kind,
              slug: g.slug,
              emoji: g.emoji || '📖',
              titleVi: g.title_vi,
              sort: g.sort,
              totalCount: g.phrase_pairs?.[0]?.count || 0,
            }))
          );
        }
      }
      setIsLoadingGroups(false);
    };

    fetchGroups();
  }, []);

  // Nếu được truyền một câu cụ thể để luyện (từ Mẫu câu hoặc Sổ lỗi)
  useEffect(() => {
    if (initialPhrase?.a) {
      const qHanzi = initialPhrase.q || '请读出以下句子：';
      const qPinyin = pinyin(qHanzi);
      const aHanzi = initialPhrase.a;
      const aPinyin = pinyin(aHanzi);
      setPracticeQueue([{
        id: 999999,
        groupId: 0,
        sort: 1,
        qHanzi,
        qPinyin,
        qVi: initialPhrase.q ? 'Câu hỏi / ngữ cảnh' : 'Hãy đọc to câu sau:',
        aHanzi,
        aPinyin,
        aVi: '',
      }]);
      setCurrentIndex(0);
      setLastScore(null);
      setAttemptCount(0);
      setHeardText('');
      setIsSessionActive(true);
      setIsSummaryActive(false);
    }
  }, [initialPhrase]);

  // Bắt đầu một buổi luyện tập
  const handleStartPractice = async (group?: PhraseGroup) => {
    let items: PhrasePair[] = [];

    if (sourceType === 'mistakes') {
      // Tải từ sổ lỗi
      if (user && isSupabaseConfigured) {
        const { data } = await supabase
          .from('mistakes')
          .select('*')
          .eq('user_id', user.id)
          .eq('passed', false)
          .limit(15);
        if (data && data.length > 0) {
          items = data.map((m: any, idx: number) => ({
            id: m.id,
            groupId: 0,
            sort: idx,
            qHanzi: '请读出以下正确句子：',
            qPinyin: 'Qǐng dú chū yǐxià zhèngquè jùzi:',
            qVi: 'Hãy đọc lại câu chuẩn sau:',
            aHanzi: m.correct_hanzi,
            aPinyin: m.correct_pinyin || '',
            aVi: m.correct_vi || '',
          }));
        }
      }
    } else if (sourceType === 'favorites') {
      // Tải các câu yêu thích
      if (user && isSupabaseConfigured) {
        const { data } = await supabase
          .from('user_phrase_progress')
          .select('phrase_pairs(*)')
          .eq('user_id', user.id)
          .eq('favorited', true);
        if (data) {
          items = data.map((d: any) => ({
            id: d.phrase_pairs.id,
            groupId: d.phrase_pairs.group_id,
            sort: d.phrase_pairs.sort,
            qHanzi: d.phrase_pairs.q_hanzi,
            qPinyin: d.phrase_pairs.q_pinyin,
            qVi: d.phrase_pairs.q_vi,
            aHanzi: d.phrase_pairs.a_hanzi,
            aPinyin: d.phrase_pairs.a_pinyin,
            aVi: d.phrase_pairs.a_vi,
          }));
        }
      }
    } else if (group) {
      // Tải theo nhóm
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('phrase_pairs')
          .select('*')
          .eq('group_id', group.id)
          .order('sort', { ascending: true });
        if (data) {
          items = data.map((p: any) => ({
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
          }));
        }
      }
    }

    if (items.length === 0) {
      alert('Không có câu nào trong danh mục này! Hãy chọn nhóm khác nhé.');
      return;
    }

    setPracticeQueue(items);
    setCurrentIndex(0);
    setLastScore(null);
    setAttemptCount(0);
    setHeardText('');
    setActiveTip(null);
    setShowAnswerInQA(false);
    setIsSessionActive(true);
    setIsSummaryActive(false);

    // Phát âm câu đầu tiên sau 300ms
    setTimeout(() => {
      playPromptAudio(items[0]);
    }, 400);
  };

  const currentItem = practiceQueue[currentIndex];

  // Phát âm câu mẫu
  const playPromptAudio = (item: PhrasePair, rateMultiplier: number = 1.0) => {
    const textToSpeak = mode === 'qa' ? item.qHanzi : item.aHanzi;
    playZhAudio(textToSpeak, (settings.speechRate || 1.0) * rateMultiplier);
  };

  // Chấm điểm âm tiết
  const handleGrade = async (spoken: string) => {
    if (!currentItem) return;

    const targetHanzi = currentItem.aHanzi;
    const result = evaluatePronunciation(targetHanzi, spoken, [], settings.passThreshold || 80);

    setLastScore(result);
    setAttemptCount((prev) => prev + 1);

    // Tìm mẹo thanh điệu nếu sai
    const failedSyllable = result.perSyllable.find((s) => s.status !== 'ok');
    if (failedSyllable) {
      setActiveTip(getTipForSyllable(failedSyllable.target));
    } else {
      setActiveTip(null);
    }

    // Lưu tiến trình vào Supabase nếu đạt hoặc có điểm tốt
    if (user && isSupabaseConfigured) {
      try {
        await supabase.from('user_phrase_progress').upsert({
          user_id: user.id,
          pair_id: currentItem.id,
          best_score: Math.max(result.score, currentItem.bestScore || 0),
          attempts: (currentItem.attempts || 0) + 1,
          passed: result.passed || currentItem.passed,
          last_practiced_at: new Date().toISOString(),
        });

        // Tăng daily_activity.shadowing_done
        const todayVn = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
        try {
          await supabase.rpc('increment_daily_activity', {
            p_user_id: user.id,
            p_day: todayVn,
            p_column: 'shadowing_done',
          });
        } catch {
          // Fallback nếu rpc chưa tạo
          await supabase.from('daily_activity').upsert({
            user_id: user.id,
            day: todayVn,
            shadowing_done: 1,
          });
        }
      } catch (e) {}
    }

    // Nếu không đạt và đã thử ≥ 3 lần, tự động thêm vào sổ lỗi (mistakes)
    if (!result.passed && attemptCount >= 2 && user && isSupabaseConfigured) {
      await supabase.from('mistakes').insert({
        user_id: user.id,
        user_said: spoken,
        correct_hanzi: currentItem.aHanzi,
        correct_pinyin: currentItem.aPinyin,
        correct_vi: currentItem.aVi,
        explanation: 'Luyện chưa đạt trong buổi Shadowing',
        error_type: 'pronunciation',
        best_score: result.score,
        passed: false,
      });
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
      setShowAnswerInQA(false);
      setTimeout(() => {
        playPromptAudio(practiceQueue[nextIdx]);
      }, 300);
    } else {
      setIsSummaryActive(true);
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
        // ===== MÀN HÌNH 1: CHỌN NỘI DUNG & CHẾ ĐỘ SHADOWING =====
        <div>
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2.5">
              <Headphones className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-stone-900">Luyện nói Shadowing</h2>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1 leading-relaxed">
              Nghe câu mẫu ➔ Nhại lại ➔ Chấm điểm từng âm tiết xanh/cam/đỏ ➔ Lặp lại tới khi đạt chuẩn!
            </p>
          </div>

          {/* 1. Chọn chế độ luyện */}
          <div className="mb-4">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2 px-1">
              1. Chọn kiểu luyện nói:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('mimic')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  mode === 'mimic'
                    ? 'border-red-500 bg-red-50 text-red-900 shadow-2xs font-bold'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="text-xs flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-red-600" />
                  <span>Nhại lại câu mẫu</span>
                </div>
                <div className="text-[10px] text-stone-500 font-normal mt-0.5">
                  Nghe người bản xứ nói rồi lặp lại y hệt
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('qa')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  mode === 'qa'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-2xs font-bold'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Đối đáp phản xạ</span>
                </div>
                <div className="text-[10px] text-stone-500 font-normal mt-0.5">
                  Nghe câu hỏi và tự nhớ câu trả lời để nói
                </div>
              </button>
            </div>
          </div>

          {/* 2. Chọn nguồn bài luyện */}
          <div className="mb-4">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2 px-1">
              2. Chọn nguồn bài luyện:
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSourceType('daily')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                  sourceType === 'daily'
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-white text-stone-700'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Mẫu câu Đời sống</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('workplace')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                  sourceType === 'workplace'
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-white text-stone-700'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Mẫu câu Công sở</span>
              </button>
            </div>

            {/* Quick access: Sổ lỗi & Yêu thích */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setSourceType('mistakes');
                  handleStartPractice();
                }}
                className="p-3 rounded-2xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 text-left transition-colors"
              >
                <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <BookMarked className="w-4 h-4 text-rose-600" />
                  <span>Luyện lại câu sai</span>
                </div>
                <div className="text-[10px] text-rose-700 mt-0.5">Lấy trực tiếp từ Sổ lỗi</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceType('favorites');
                  handleStartPractice();
                }}
                className="p-3 rounded-2xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 text-left transition-colors"
              >
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                  <span>Câu yêu thích</span>
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5">Các câu đã đánh dấu ⭐</div>
              </button>
            </div>
          </div>

          {/* 3. Danh sách nhóm để bấm vào bắt đầu */}
          {(sourceType === 'daily' || sourceType === 'workplace') && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider px-1">
                Chọn nhóm câu muốn luyện:
              </div>

              {isLoadingGroups ? (
                <div className="py-8 flex justify-center text-stone-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                groups
                  .filter((g) => g.kind === sourceType)
                  .map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleStartPractice(group)}
                      className="w-full p-3.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between text-left shadow-2xs active:scale-98 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{group.emoji}</span>
                        <div>
                          <div className="font-bold text-sm text-stone-900 group-hover:text-red-600 transition-colors">
                            {group.titleVi}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {group.totalCount || 0} câu mẫu
                          </div>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-red-50 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1 group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <span>Luyện</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))
              )}
            </div>
          )}
        </div>
      ) : isSummaryActive ? (
        // ===== MÀN HÌNH TỔNG KẾT BUỔI SHADOWING =====
        <div className="text-center py-6 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 text-3xl shadow-xs">
            🎉
          </div>
          <h2 className="text-xl font-black text-stone-900 mb-1">Hoàn thành bài Shadowing!</h2>
          <p className="text-xs text-stone-500 mb-6">Bạn đã kiên trì luyện tập hết danh sách câu mẫu.</p>

          <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs mb-6 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 text-xs">
              <span className="text-stone-500">Tổng số câu luyện:</span>
              <span className="font-bold text-stone-900">{practiceQueue.length} câu</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">Ngưỡng đạt yêu cầu:</span>
              <span className="font-bold text-emerald-700">≥ {settings.passThreshold || 80}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleStartPractice(selectedGroup || undefined)}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Luyện lại bộ này</span>
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
        // ===== MÀN HÌNH 2: LUYỆN TẬP TỪNG CÂU =====
        currentItem && (
          <div className="space-y-4">
            {/* Header thanh tiến độ */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <button
                type="button"
                onClick={() => setIsSessionActive(false)}
                className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Thoát</span>
              </button>
              <div className="text-xs font-bold text-stone-900">
                Câu {currentIndex + 1} / {practiceQueue.length}
              </div>
              {/* Công tắc ẩn Pinyin/Hán tự */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setHidePinyin(!hidePinyin)}
                  className={`p-1.5 rounded-xl border text-[11px] font-bold ${
                    hidePinyin ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                  title="Ẩn/Hiện Pinyin"
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setHideHanzi(!hideHanzi)}
                  className={`p-1.5 rounded-xl border text-[11px] font-bold ${
                    hideHanzi ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                  title="Ẩn/Hiện Chữ Hán"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Thẻ câu mẫu */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs space-y-3">
              {mode === 'qa' && (
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/60 mb-2">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    ❓ Câu hỏi:
                  </div>
                  <div className="text-base font-bold text-stone-900">{currentItem.qHanzi}</div>
                  <div className="text-xs text-red-700 font-semibold">{currentItem.qPinyin}</div>
                  <div className="text-xs text-stone-600 italic">"{currentItem.qVi}"</div>
                </div>
              )}

              {/* Câu trả lời mục tiêu (Target) */}
              <div>
                <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>{mode === 'qa' ? '✅ Bạn cần nói câu này:' : '🎧 Câu mẫu nhại theo:'}</span>
                  {mode === 'qa' && (
                    <button
                      type="button"
                      onClick={() => setShowAnswerInQA(!showAnswerInQA)}
                      className="text-[10px] text-amber-800 hover:underline font-bold"
                    >
                      {showAnswerInQA ? 'Che lại' : 'Xem đáp án'}
                    </button>
                  )}
                </div>

                {mode === 'qa' && !showAnswerInQA ? (
                  <div className="py-4 text-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-2xl">
                    Hãy nhớ lại câu trả lời và bấm Mic để nói
                  </div>
                ) : (
                  <div className="space-y-1">
                    {!hideHanzi && (
                      <div className="text-2xl font-bold text-stone-900 tracking-wide font-sans">
                        {currentItem.aHanzi}
                      </div>
                    )}
                    {!hidePinyin && (
                      <div className="text-xs font-semibold text-red-700 tracking-wide">
                        {currentItem.aPinyin}
                      </div>
                    )}
                    <div className="text-xs text-stone-600 italic">
                      "{currentItem.aVi}"
                    </div>
                  </div>
                )}
              </div>

              {/* Nút nghe lại */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => playPromptAudio(currentItem, 1.0)}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe mẫu</span>
                </button>

                <button
                  type="button"
                  onClick={() => playPromptAudio(currentItem, 0.7)}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                >
                  <Turtle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Nghe chậm</span>
                </button>
              </div>
            </div>

            {/* BẢNG KẾT QUẢ CHẤM ĐIỂM (nếu đã nói) */}
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
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-transform"
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
            <div className="pt-2 flex flex-col items-center">
              {isListening && (
                <div className="mb-2 p-2.5 rounded-2xl bg-red-50 border border-red-200 text-center w-full animate-fade-in">
                  <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-0.5">
                    🎙️ Đang nghe... Hãy nói câu tiếng Trung
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
          </div>
        )
      )}
    </div>
  );
};

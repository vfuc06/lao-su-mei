import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MistakeItem } from '../types';
import { X, BookMarked, CheckCircle2, AlertCircle, Headphones, Loader2 } from 'lucide-react';

interface MistakesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPracticePhrase: (hanzi: string, pinyin?: string, vi?: string) => void;
}

export const MistakesModal: React.FC<MistakesModalProps> = ({
  isOpen,
  onClose,
  onPracticePhrase,
}) => {
  const { user } = useAuth();
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadMistakes = async () => {
      setIsLoading(true);
      if (user && isSupabaseConfigured) {
        const { data } = await supabase
          .from('mistakes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (data) {
          setMistakes(
            data.map((m: any) => ({
              id: m.id,
              userSaid: m.user_said,
              correctHanzi: m.correct_hanzi,
              correctPinyin: m.correct_pinyin,
              correctVi: m.correct_vi,
              explanation: m.explanation,
              errorType: m.error_type,
              attempts: m.attempts,
              bestScore: m.best_score,
              passed: m.passed,
              createdAt: m.created_at,
            }))
          );
        }
      } else {
        // Tải từ localStorage nếu là khách
        try {
          const local = localStorage.getItem('lao_su_mei_mistakes');
          if (local) {
            setMistakes(JSON.parse(local));
          }
        } catch (e) {}
      }
      setIsLoading(false);
    };

    loadMistakes();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const filtered = mistakes.filter((m) => {
    if (filter === 'unresolved') return !m.passed;
    if (filter === 'resolved') return m.passed;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <BookMarked className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Sổ câu cần luyện lại</h3>
              <p className="text-[10px] text-stone-500 font-medium">Các câu từng nói sai trong hội thoại</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bộ lọc */}
        <div className="flex items-center gap-1.5 py-3 border-b border-stone-100 flex-shrink-0">
          {[
            { id: 'all', label: `Tất cả (${mistakes.length})` },
            { id: 'unresolved', label: `Chưa đạt (${mistakes.filter((m) => !m.passed).length})` },
            { id: 'resolved', label: `Đã đạt (${mistakes.filter((m) => m.passed).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === tab.id
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Danh sách câu lỗi */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-stone-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-red-600" />
              <span className="text-xs">Đang tải sổ lỗi...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-xs font-semibold text-stone-600">
                {filter === 'unresolved'
                  ? 'Không còn câu nào chưa đạt! Bạn phát âm rất chuẩn.'
                  : 'Sổ lỗi hiện đang trống. Hãy tiếp tục luyện nói nhé!'}
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  item.passed
                    ? 'bg-stone-50/70 border-stone-200'
                    : 'bg-rose-50/50 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="space-y-1">
                    <div className="text-xs text-rose-700 flex items-center gap-1 line-through opacity-80">
                      <span>Bạn nói:</span> {item.userSaid}
                    </div>
                    <div className="text-sm font-bold text-stone-900">
                      {item.correctHanzi}
                    </div>
                    {item.correctPinyin && (
                      <div className="text-xs font-semibold text-red-700">
                        {item.correctPinyin}
                      </div>
                    )}
                    {item.correctVi && (
                      <div className="text-xs text-stone-600">
                        "{item.correctVi}"
                      </div>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                      item.passed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.passed ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Đã đạt
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" /> Cần sửa
                      </>
                    )}
                  </span>
                </div>

                {item.explanation && (
                  <p className="text-[11px] text-stone-600 bg-white/80 p-2 rounded-xl mb-2 border border-stone-200/60 leading-relaxed">
                    💡 <b>Giải thích:</b> {item.explanation}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPracticePhrase(item.correctHanzi, item.correctPinyin, item.correctVi);
                  }}
                  className="w-full py-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-all"
                >
                  <Headphones className="w-3.5 h-3.5 text-red-600" />
                  <span>Luyện lại câu này bằng Shadowing</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};


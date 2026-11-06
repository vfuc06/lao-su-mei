import React, { useState, useEffect } from 'react';
import { ConversationMode, PhraseGroup, PhrasePair } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ZhText } from '../components/ZhText';
import { INITIAL_PHRASE_GROUPS, INITIAL_PHRASE_PAIRS } from '../lib/initialData';
import {
  BookOpen,
  Coffee,
  Briefcase,
  Search,
  Eye,
  EyeOff,
  Star,
  Headphones,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface PhrasesTabProps {
  onPracticePair?: (qHanzi: string, aHanzi: string) => void;
}

export const PhrasesTab: React.FC<PhrasesTabProps> = ({ onPracticePair }) => {
  const { user } = useAuth();
  const [activeKind, setActiveKind] = useState<ConversationMode>('daily');
  // Khởi tạo ngay lập tức với 14 nhóm cục bộ để không bao giờ bị chờ màn hình trắng
  const [groups, setGroups] = useState<PhraseGroup[]>(INITIAL_PHRASE_GROUPS);
  const [selectedGroup, setSelectedGroup] = useState<PhraseGroup | null>(null);
  const [pairs, setPairs] = useState<PhrasePair[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingPairs, setIsLoadingPairs] = useState(false);

  // Bộ lọc & Tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unpassed' | 'passed' | 'favorite'>('all');
  const [isHideAnswers, setIsHideAnswers] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<number, boolean>>({});

  // 1. Tải danh sách nhóm (phrase_groups) từ Supabase đồng bộ ngầm
  useEffect(() => {
    const fetchGroups = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase
          .from('phrase_groups')
          .select('*, phrase_pairs(count)')
          .order('sort', { ascending: true });

        if (data && !error && data.length > 0) {
          const mapped: PhraseGroup[] = data.map((g: any) => ({
            id: g.id,
            kind: g.kind,
            slug: g.slug,
            emoji: g.emoji || '📖',
            titleVi: g.title_vi,
            sort: g.sort,
            totalCount: g.phrase_pairs?.[0]?.count || 0,
          }));
          setGroups(mapped);
        }
      } catch (err) {
        console.warn('Lỗi tải nhóm từ Supabase, dùng dữ liệu sẵn có:', err);
      }
    };

    fetchGroups();
  }, []);

  // 2. Tải các cặp câu khi chọn 1 nhóm (Ưu tiên hiển thị tức thì từ bộ nạp sẵn)
  useEffect(() => {
    if (!selectedGroup) return;

    // 2.1 Hiển thị ngay lập tức các câu từ bộ nạp sẵn (0ms delay)
    const localMatches = INITIAL_PHRASE_PAIRS.filter(
      (p) => p.slug === selectedGroup.slug || p.groupId === selectedGroup.id
    );
    if (localMatches.length > 0) {
      setPairs(localMatches);
      setIsLoadingPairs(false);
    } else {
      setIsLoadingPairs(true);
    }

    // 2.2 Đồng bộ ngầm tiến trình cá nhân từ Supabase
    const syncWithDatabase = async () => {
      try {
        let progressMap: Record<number, { favorited: boolean; passed: boolean; bestScore: number }> = {};

        // Đọc từ localStorage cho khách
        try {
          const savedFavs = JSON.parse(localStorage.getItem('lao_su_mei_fav_pairs') || '[]');
          savedFavs.forEach((id: number) => {
            progressMap[id] = { favorited: true, passed: false, bestScore: 0 };
          });
        } catch (e) {}

        if (isSupabaseConfigured && user) {
          const { data: progData } = await supabase
            .from('user_phrase_progress')
            .select('pair_id, favorited, passed, best_score')
            .eq('user_id', user.id);

          if (progData) {
            progData.forEach((p: any) => {
              progressMap[p.pair_id] = {
                favorited: p.favorited,
                passed: p.passed,
                bestScore: p.best_score,
              };
            });
          }
        }

        // Cập nhật trạng thái yêu thích / hoàn thành vào danh sách câu
        setPairs((prev) =>
          prev.map((p) => ({
            ...p,
            favorited: progressMap[p.id]?.favorited ?? p.favorited ?? false,
            passed: progressMap[p.id]?.passed ?? p.passed ?? false,
            bestScore: progressMap[p.id]?.bestScore ?? p.bestScore ?? 0,
          }))
        );
      } catch (err) {
        console.warn('Lỗi đồng bộ tiến trình mẫu câu:', err);
      } finally {
        setIsLoadingPairs(false);
      }
    };

    syncWithDatabase();
  }, [selectedGroup, user]);

  // Bật/tắt yêu thích (⭐)
  const handleToggleFavorite = async (pairId: number, currentFav: boolean) => {
    const nextFav = !currentFav;
    setPairs((prev) =>
      prev.map((p) => (p.id === pairId ? { ...p, favorited: nextFav } : p))
    );

    if (user && isSupabaseConfigured) {
      await supabase
        .from('user_phrase_progress')
        .upsert({ user_id: user.id, pair_id: pairId, favorited: nextFav });
    } else {
      try {
        const saved: number[] = JSON.parse(localStorage.getItem('lao_su_mei_fav_pairs') || '[]');
        const updated = nextFav ? [...saved, pairId] : saved.filter((id) => id !== pairId);
        localStorage.setItem('lao_su_mei_fav_pairs', JSON.stringify(updated));
      } catch (e) {}
    }
  };

  const filteredGroups = groups.filter((g) => g.kind === activeKind);

  // Lọc cặp câu
  const filteredPairs = pairs.filter((p) => {
    if (filter === 'favorite' && !p.favorited) return false;
    if (filter === 'passed' && !p.passed) return false;
    if (filter === 'unpassed' && p.passed) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        p.qHanzi.includes(q) ||
        p.qPinyin.toLowerCase().includes(q) ||
        p.qVi.toLowerCase().includes(q);
      const matchA =
        p.aHanzi.includes(q) ||
        p.aPinyin.toLowerCase().includes(q) ||
        p.aVi.toLowerCase().includes(q);
      if (!matchQ && !matchA) return false;
    }

    return true;
  });

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto animate-fade-in">
      {!selectedGroup ? (
        // ===== MÀN HÌNH 1: DANH SÁCH NHÓM MẪU CÂU =====
        <div>
          {/* Phân đoạn: Đời sống vs Công sở */}
          <div className="flex items-center p-1 bg-stone-200/80 rounded-2xl mb-4 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveKind('daily')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeKind === 'daily'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span>🍜 Mẫu câu Đời sống</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveKind('workplace')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeKind === 'workplace'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-red-600" />
              <span>💼 Mẫu câu Công sở</span>
            </button>
          </div>

          <div className="space-y-2 mb-4">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider px-1">
              Chọn chủ đề mẫu câu ({filteredGroups.length} nhóm):
            </div>

            {isLoadingGroups ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-400">
                <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                <span className="text-xs">Đang tải kho mẫu câu...</span>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroup(group);
                    setSearchQuery('');
                    setFilter('all');
                  }}
                  className="w-full p-4 bg-white hover:bg-stone-50 border border-stone-200/90 rounded-2xl flex items-center justify-between text-left shadow-2xs hover:shadow-xs transition-all active:scale-98 group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      {group.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-stone-900 truncate">
                        {group.titleVi}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {group.totalCount ? `${group.totalCount} cặp hỏi - đáp` : 'Nhiều câu thông dụng'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        // ===== MÀN HÌNH 2: CẶP HỎI - ĐÁP CHI TIẾT =====
        <div>
          {/* Header nhóm */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200">
            <button
              type="button"
              onClick={() => setSelectedGroup(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 py-1 px-2 rounded-xl hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
            <div className="font-black text-sm text-stone-900 flex items-center gap-1.5 truncate max-w-[200px]">
              <span>{selectedGroup.emoji}</span>
              <span className="truncate">{selectedGroup.titleVi}</span>
            </div>
          </div>

          {/* Công cụ: Tìm kiếm & Công tắc che đáp án */}
          <div className="space-y-2.5 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm chữ Hán, pinyin hoặc tiếng Việt..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-hidden focus:border-red-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              {/* Lọc trạng thái */}
              <div className="flex items-center gap-1 text-xs">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'favorite', label: '⭐ Thích' },
                  { id: 'passed', label: '✔ Đạt' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id as any)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                      filter === item.id
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Nút che đáp án */}
              <button
                type="button"
                onClick={() => setIsHideAnswers(!isHideAnswers)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shadow-2xs ${
                  isHideAnswers
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {isHideAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isHideAnswers ? 'Đang che đáp án' : 'Che đáp án'}</span>
              </button>
            </div>
          </div>

          {/* Danh sách các cặp hỏi - đáp */}
          {isLoadingPairs ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin text-red-600" />
              <span className="text-xs">Đang tải các cặp mẫu câu...</span>
            </div>
          ) : filteredPairs.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <div className="text-2xl mb-1">🔍</div>
              <p className="text-xs font-semibold">Không tìm thấy cặp câu phù hợp.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPairs.map((pair, index) => {
                const isRevealed = revealedIds[pair.id] ?? !isHideAnswers;
                return (
                  <div
                    key={pair.id}
                    className="p-4 bg-white rounded-3xl border border-stone-200/90 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
                  >
                    {/* 1. CÂU HỎI (Bên trên - Bong bóng xám) */}
                    <div className="p-3 bg-stone-50 border border-stone-200/70 rounded-2xl">
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span>❓ Câu hỏi #{index + 1}</span>
                      </div>
                      <ZhText
                        hanzi={pair.qHanzi}
                        pinyin={pair.qPinyin}
                        vietnamese={pair.qVi}
                        fontSize="base"
                      />
                    </div>

                    {/* 2. CÂU TRẢ LỜI (Ngay bên dưới - Bong bóng màu ấm) */}
                    <div className="p-3 bg-red-50/60 border border-red-200/60 rounded-2xl relative">
                      <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>✅ Câu trả lời chuẩn</span>
                        {pair.passed && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Đã đạt
                          </span>
                        )}
                      </div>

                      {isRevealed ? (
                        <ZhText
                          hanzi={pair.aHanzi}
                          pinyin={pair.aPinyin}
                          vietnamese={pair.aVi}
                          fontSize="base"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRevealedIds((prev) => ({ ...prev, [pair.id]: true }))}
                          className="w-full py-4 text-center text-xs font-bold text-amber-900 bg-amber-100/70 hover:bg-amber-100 rounded-xl border border-dashed border-amber-300 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-4 h-4 text-amber-700" />
                          <span>Bấm để mở đáp án (Tự kiểm tra)</span>
                        </button>
                      )}
                    </div>

                    {/* 3. Ghi chú cách dùng nếu có */}
                    {pair.noteVi && (
                      <p className="text-[11px] text-stone-500 italic px-1">
                        📌 <b>Ghi chú:</b> {pair.noteVi}
                      </p>
                    )}

                    {/* 4. Thanh hành động: Luyện câu này + Yêu thích */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => onPracticePair?.(pair.qHanzi, pair.aHanzi)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold active:scale-95 transition-all shadow-2xs"
                      >
                        <Headphones className="w-3.5 h-3.5" />
                        <span>🎤 Luyện câu này</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(pair.id, pair.favorited || false)}
                        className={`p-1.5 rounded-xl border transition-colors ${
                          pair.favorited
                            ? 'bg-amber-50 border-amber-300 text-amber-500'
                            : 'bg-stone-50 border-stone-200 text-stone-400 hover:text-stone-700'
                        }`}
                        title="Yêu thích câu này"
                      >
                        <Star className={`w-4 h-4 ${pair.favorited ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

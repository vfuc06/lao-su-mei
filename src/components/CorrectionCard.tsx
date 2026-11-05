import React from 'react';
import { ZhLine, CorrectionChunk, ScoreOutput } from '../types';
import { ZhText } from './ZhText';
import { ScoreRing } from './ScoreRing';
import { SyllableDiff } from './SyllableDiff';
import { getTipForSyllable } from '../lib/pronunciationTips';
import {
  AlertCircle,
  Volume2,
  Turtle,
  Mic,
  Square,
  Sparkles,
  BookmarkPlus,
  ArrowRight,
  Info,
} from 'lucide-react';

interface CorrectionCardProps {
  userSaid: string;
  explanationVi: string;
  directionVi?: string;
  correctSentence: ZhLine;
  chunks?: CorrectionChunk[];
  attempts: number;
  passThreshold: number;
  lastScore: ScoreOutput | null;
  isListening: boolean;
  heardText: string;
  onToggleMic: () => void;
  onSkipToMistakes: () => void;
  onSpeak: (text: string, rate?: number) => void;
}

export const CorrectionCard: React.FC<CorrectionCardProps> = ({
  userSaid,
  explanationVi,
  directionVi,
  correctSentence,
  chunks = [],
  attempts,
  passThreshold,
  lastScore,
  isListening,
  heardText,
  onToggleMic,
  onSkipToMistakes,
  onSpeak,
}) => {
  // Lấy mẹo phát âm nếu sau ≥ 3 lần thử
  const phoneticTip =
    attempts >= 3 && lastScore?.perSyllable
      ? lastScore.perSyllable.find((s) => s.status !== 'ok')
      : null;
  const tipText = phoneticTip ? getTipForSyllable(phoneticTip.target) : null;

  return (
    <div className="bg-rose-50/90 border-2 border-rose-300 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5 my-3 animate-fade-in text-stone-900">
      {/* 1. Tiêu đề Thẻ Sửa Lỗi */}
      <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
        <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>Lão Sư Mei sửa lỗi cho bạn (Gia sư nghiêm)</span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
          Lần thử: {attempts}
        </span>
      </div>

      {/* 2. Bạn nói (Câu sai) */}
      <div className="bg-white/80 rounded-2xl p-3 border border-rose-200">
        <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-0.5">
          ❌ Bạn vừa nói:
        </div>
        <div className="text-sm font-bold text-rose-950 font-sans line-through decoration-rose-400">
          {userSaid}
        </div>
      </div>

      {/* 3. Vì sao chưa đúng & Hướng dẫn */}
      <div className="text-xs text-stone-700 leading-relaxed space-y-1">
        <div>
          <span className="font-bold text-rose-900">💡 Vì sao chưa đúng: </span>
          <span>{explanationVi}</span>
        </div>
        {directionVi && (
          <div className="text-stone-600 italic">
            <span className="font-semibold text-stone-700">Người bản xứ thường nói: </span>
            {directionVi}
          </div>
        )}
      </div>

      {/* 4. Câu chuẩn học viên BẮT BUỘC phải nói */}
      <div className="bg-white rounded-2xl p-3.5 border-2 border-emerald-400 shadow-2xs">
        <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>✅ Hãy nói câu này để đi tiếp (≥ {passThreshold}%):</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSpeak(correctSentence.hanzi, 1.0)}
              className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
              title="Nghe chuẩn"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSpeak(correctSentence.hanzi, attempts >= 3 ? 0.6 : 0.75)}
              className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
              title="Nghe chậm"
            >
              <Turtle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <ZhText
          hanzi={correctSentence.hanzi}
          pinyin={correctSentence.pinyin}
          vietnamese={correctSentence.vietnamese}
          fontSize="lg"
        />
      </div>

      {/* 5. Tách cụm nhỏ chunks (sau 2 lần thử không đạt) */}
      {attempts >= 2 && chunks.length > 0 && (
        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Tách cụm ngắn để nhại lại:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {chunks.map((chunk, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSpeak(chunk.hanzi, 0.8)}
                className="px-2.5 py-1 rounded-xl bg-white border border-amber-300 text-xs font-bold text-stone-800 hover:bg-amber-100/60 active:scale-95 transition-all flex items-center gap-1"
              >
                <span>{chunk.hanzi}</span>
                <span className="text-[10px] text-amber-700 font-mono">[{chunk.pinyin}]</span>
                <Volume2 className="w-3 h-3 text-stone-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. Mẹo phát âm so với tiếng Việt (sau 3 lần thử) */}
      {attempts >= 3 && tipText && (
        <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-[11px] mb-0.5">Mẹo phát âm từ Mei:</div>
            <div>{tipText}</div>
          </div>
        </div>
      )}

      {/* 7. Kết quả chấm điểm lần nói vừa rồi nếu chưa đạt */}
      {lastScore && !lastScore.passed && (
        <div className="p-3 bg-white rounded-2xl border border-stone-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-stone-600 mb-1">
              Bạn vừa đọc: <span className="text-stone-900">{heardText || '(chưa nghe rõ)'}</span>
            </div>
            <SyllableDiff perSyllable={lastScore.perSyllable} extra={lastScore.extra} />
          </div>
          <ScoreRing score={lastScore.score} passThreshold={passThreshold} size="sm" />
        </div>
      )}

      {/* 8. Thanh hành động: Bấm mic nói lại hoặc Bỏ qua lưu sổ lỗi */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={onToggleMic}
          className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 ${
            isListening
              ? 'bg-amber-500 text-white animate-pulse'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
          }`}
        >
          {isListening ? (
            <>
              <Square className="w-4 h-4 fill-white" />
              <span>Đang nghe câu nói lại... bấm để dừng</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Bấm mic để nói lại câu chuẩn</span>
            </>
          )}
        </button>

        {/* Nút bỏ qua & lưu vào sổ lỗi nếu thử ≥ 5 lần */}
        {attempts >= 5 && (
          <button
            type="button"
            onClick={onSkipToMistakes}
            className="w-full py-2.5 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-stone-500" />
            <span>Khó quá? Bỏ qua & Lưu vào Sổ lỗi để ôn sau</span>
          </button>
        )}
      </div>
    </div>
  );
};


import React from 'react';
import { SyllableMatch } from '../types';

interface SyllableDiffProps {
  perSyllable: SyllableMatch[];
  extra?: string[];
  className?: string;
}

export const SyllableDiff: React.FC<SyllableDiffProps> = ({
  perSyllable,
  extra = [],
  className = '',
}) => {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 1. Lưới các âm tiết */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {perSyllable.map((item, idx) => {
          const statusClass = {
            ok: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            tone: 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400',
            wrong: 'bg-rose-100 text-rose-800 border-rose-300',
            missing: 'bg-stone-200 text-stone-500 border-stone-300 border-dashed',
          }[item.status];

          const statusIcon = {
            ok: '✓',
            tone: '~',
            wrong: '✕',
            missing: '?',
          }[item.status];

          return (
            <div
              key={idx}
              className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${statusClass}`}
            >
              <div className="flex items-center gap-1">
                <span>{item.target}</span>
                <span className="text-[10px] opacity-70 font-mono">{statusIcon}</span>
              </div>
              {item.status !== 'ok' && item.heard && (
                <div className="text-[10px] font-normal opacity-90 mt-0.5">
                  Nghe: {item.heard}
                </div>
              )}
            </div>
          );
        })}

        {/* Các âm tiết nói thừa */}
        {extra.map((ex, idx) => (
          <div
            key={`extra-${idx}`}
            className="px-2 py-1 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1 line-through opacity-75"
            title="Âm tiết thừa"
          >
            <span>Thừa: {ex}</span>
          </div>
        ))}
      </div>

      {/* 2. Chú thích màu sắc */}
      <div className="flex items-center gap-3 text-[10px] text-stone-500 pt-0.5">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Đúng</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Sai thanh điệu</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Sai / thiếu</span>
        </span>
      </div>
    </div>
  );
};

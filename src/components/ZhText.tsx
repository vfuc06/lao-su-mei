import React from 'react';
import { Volume2, Turtle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ZhTextProps {
  hanzi: string;
  pinyin?: string;
  vietnamese?: string;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  onSpeak?: (text: string, rate: number) => void;
  className?: string;
}

export const ZhText: React.FC<ZhTextProps> = ({
  hanzi,
  pinyin,
  vietnamese,
  fontSize = 'xl',
  onSpeak,
  className = '',
}) => {
  const { settings } = useAuth();

  const handlePlayNormal = () => {
    if (onSpeak) {
      onSpeak(hanzi, settings.speechRate || 1.0);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(hanzi);
      u.lang = 'zh-CN';
      u.rate = settings.speechRate || 1.0;
      window.speechSynthesis.speak(u);
    }
  };

  const handlePlaySlow = () => {
    if (onSpeak) {
      onSpeak(hanzi, 0.7);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(hanzi);
      u.lang = 'zh-CN';
      u.rate = 0.7;
      window.speechSynthesis.speak(u);
    }
  };

  const fontClass = {
    sm: 'text-base',
    base: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
    '2xl': 'text-3xl',
  }[fontSize];

  return (
    <div className={`space-y-1 ${className}`}>
      {/* 1. Hán tự lớn (≥ 22px chuẩn mobile) */}
      <div className={`${fontClass} font-bold text-stone-900 tracking-wide font-sans select-text`}>
        {hanzi}
      </div>

      {/* 2. Pinyin có dấu thanh (theo cài đặt) */}
      {settings.showPinyin && pinyin && (
        <div className="text-xs font-semibold text-red-700 tracking-wide select-text">
          {pinyin}
        </div>
      )}

      {/* 3. Dịch nghĩa tiếng Việt (theo cài đặt) */}
      {settings.showVi && vietnamese && (
        <div className="text-xs text-stone-600 italic select-text">
          "{vietnamese}"
        </div>
      )}

      {/* 4. Nút nghe phát âm */}
      <div className="flex items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={handlePlayNormal}
          title="Nghe phát âm chuẩn"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold active:scale-95 transition-all shadow-2xs"
        >
          <Volume2 className="w-3.5 h-3.5 text-stone-600" />
          <span>Nghe</span>
        </button>

        <button
          type="button"
          onClick={handlePlaySlow}
          title="Nghe tốc độ chậm"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold active:scale-95 transition-all border border-amber-200/60 shadow-2xs"
        >
          <Turtle className="w-3.5 h-3.5 text-amber-600" />
          <span>Nghe chậm</span>
        </button>
      </div>
    </div>
  );
};

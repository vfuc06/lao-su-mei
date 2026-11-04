import React from 'react';
import { Mic, MicOff, Loader2, Keyboard, Languages } from 'lucide-react';

interface MicButtonProps {
  isListening: boolean;
  isLoading: boolean;
  interimTranscript?: string;
  transcript?: string;
  onToggleMic: () => void;
  onSwitchToText: () => void;
  isSupported?: boolean;
  speechLang: 'zh-CN' | 'vi-VN';
  onSelectSpeechLang: (lang: 'zh-CN' | 'vi-VN') => void;
}

export const MicButton: React.FC<MicButtonProps> = ({
  isListening,
  isLoading,
  interimTranscript,
  transcript,
  onToggleMic,
  onSwitchToText,
  isSupported = true,
  speechLang,
  onSelectSpeechLang,
}) => {
  const currentLiveText = (transcript ? transcript + ' ' : '') + (interimTranscript || '');
  const isVietnameseMode = speechLang === 'vi-VN';

  return (
    <div className="w-full flex flex-col items-center justify-center pt-2 pb-3 px-4 bg-white/95 backdrop-blur-md border-t border-stone-200">
      {/* 1. NÚT CHUYỂN ĐỔI NGÔN NGỮ THU ÂM (TIẾNG TRUNG vs TIẾNG VIỆT) */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-full mb-2 shadow-inner">
        <button
          type="button"
          onClick={() => onSelectSpeechLang('zh-CN')}
          disabled={isListening}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
            !isVietnameseMode
              ? 'bg-red-600 text-white shadow-sm scale-102'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>🇨🇳 Luyện nói Tiếng Trung</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSpeechLang('vi-VN')}
          disabled={isListening}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
            isVietnameseMode
              ? 'bg-amber-600 text-white shadow-sm scale-102'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>🇻🇳 Hỏi bằng Tiếng Việt</span>
        </button>
      </div>

      {/* 2. Hiển thị dòng chữ đang nghe được theo thời gian thực */}
      {isListening && (
        <div
          className={`w-full max-w-md mb-2 p-2.5 rounded-2xl border text-center animate-fade-in ${
            isVietnameseMode
              ? 'bg-amber-50 border-amber-300 text-stone-900'
              : 'bg-red-50 border-red-200 text-stone-900'
          }`}
        >
          <div
            className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${
              isVietnameseMode ? 'text-amber-800' : 'text-red-700'
            }`}
          >
            {isVietnameseMode
              ? '🎙️ Đang nghe tiếng Việt... Hãy hỏi điều bạn muốn nói'
              : '🎙️ Đang nghe tiếng Trung... Hãy nói to rõ'}
          </div>
          <div className="text-base font-semibold min-h-[24px]">
            {currentLiveText.trim() ||
              (isVietnameseMode
                ? 'Ví dụ: "cho tôi hỏi giá bao nhiêu nói sao?"'
                : 'Ví dụ: 你好, 我要一杯咖啡...')}
          </div>
        </div>
      )}

      {/* 3. Trạng thái AI đang suy nghĩ */}
      {isLoading && (
        <div className="mb-2 flex items-center gap-2 text-stone-600 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          <span>Lão Sư Mei đang suy nghĩ và kiểm tra...</span>
        </div>
      )}

      {/* 4. NÚT MIC LỚN Ở GIỮA */}
      <div className="relative flex items-center justify-center my-1">
        {/* Vòng hào quang nhấp nháy khi đang ghi âm */}
        {isListening && (
          <div
            className={`absolute w-24 h-24 rounded-full opacity-70 animate-mic-pulse ${
              isVietnameseMode ? 'bg-amber-400' : 'bg-red-400'
            }`}
          />
        )}

        <button
          type="button"
          onClick={onToggleMic}
          disabled={isLoading || !isSupported}
          aria-label={isListening ? 'Dừng và gửi' : 'Bấm để nói'}
          className={`relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-200 active:scale-95 ${
            !isSupported
              ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
              : isLoading
              ? 'bg-stone-200 text-stone-400 cursor-wait'
              : isListening
              ? isVietnameseMode
                ? 'bg-amber-600 text-white shadow-amber-300 shadow-xl scale-105'
                : 'bg-red-600 text-white shadow-red-300 shadow-xl scale-105'
              : isVietnameseMode
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-md'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : !isSupported ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className={`w-9 h-9 ${isListening ? 'animate-bounce' : ''}`} />
          )}
        </button>
      </div>

      {/* 5. Hướng dẫn dưới nút mic */}
      <div className="mt-2 text-center flex flex-col items-center">
        <p className="text-xs font-semibold text-stone-700">
          {!isSupported
            ? 'Trình duyệt không hỗ trợ micro trực tiếp'
            : isListening
            ? 'Đang nghe... Nói xong im lặng 1.5s hoặc bấm lại để gửi'
            : isLoading
            ? 'Đang kiểm tra câu nói...'
            : isVietnameseMode
            ? 'Bấm mic và nói tiếng Việt (hỏi cách nói / nhờ chỉ)'
            : 'Bấm mic và luyện nói tiếng Trung'}
        </p>

        {/* Nút dự phòng: Gõ chữ */}
        <button
          type="button"
          onClick={onSwitchToText}
          className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition-colors py-1 px-2.5 rounded-full hover:bg-stone-100"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Không nói được? Gõ chữ</span>
        </button>
      </div>
    </div>
  );
};

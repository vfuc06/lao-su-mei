import React from 'react';
import { Mic, MicOff, Loader2, Keyboard } from 'lucide-react';

interface MicButtonProps {
  isListening: boolean;
  isLoading: boolean;
  interimTranscript?: string;
  transcript?: string;
  onToggleMic: () => void;
  onSwitchToText: () => void;
  isSupported?: boolean;
}

export const MicButton: React.FC<MicButtonProps> = ({
  isListening,
  isLoading,
  interimTranscript,
  transcript,
  onToggleMic,
  onSwitchToText,
  isSupported = true,
}) => {
  const currentLiveText = (transcript ? transcript + ' ' : '') + (interimTranscript || '');

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 px-4 bg-white/95 backdrop-blur-md border-t border-stone-200">
      {/* Hiển thị dòng chữ đang nghe được theo thời gian thực */}
      {isListening && (
        <div className="w-full max-w-md mb-2 p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-stone-800 text-center animate-fade-in">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-0.5">
            🎙️ Đang nghe bạn nói...
          </div>
          <div className="text-base font-medium hanzi-text text-stone-900 min-h-[24px]">
            {currentLiveText.trim() || 'Hãy nói tiếng Trung hoặc tiếng Việt...'}
          </div>
        </div>
      )}

      {/* Trạng thái AI đang suy nghĩ */}
      {isLoading && (
        <div className="mb-2 flex items-center gap-2 text-stone-600 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          <span>Lão Sư Mei đang suy nghĩ và chuẩn bị nói...</span>
        </div>
      )}

      {/* NÚT MIC LỚN Ở GIỮA */}
      <div className="relative flex items-center justify-center my-1">
        {/* Vòng hào quang nhấp nháy khi đang ghi âm */}
        {isListening && (
          <div className="absolute w-24 h-24 rounded-full bg-red-400 opacity-70 animate-mic-pulse" />
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
              ? 'bg-red-600 text-white shadow-red-300 shadow-xl scale-105'
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

      {/* Hướng dẫn dưới nút mic */}
      <div className="mt-2 text-center flex flex-col items-center">
        <p className="text-xs font-medium text-stone-600">
          {!isSupported
            ? 'Trình duyệt không hỗ trợ micro trực tiếp'
            : isListening
            ? 'Đang nghe... Bấm lần nữa để gửi'
            : isLoading
            ? 'Đang kết nối...'
            : 'Bấm nút mic to và nói'}
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


import React from 'react';
import { Volume2, Snail, CheckCircle2, AlertCircle } from 'lucide-react';
import { ChatMessage, UserSettings } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
  settings: UserSettings;
  isPlayingThis: boolean;
  onSpeak: (text: string, rateMultiplier?: number) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  settings,
  isPlayingThis,
  onSpeak,
}) => {
  const isAI = message.role === 'ai';

  if (!isAI) {
    // Tin nhắn của Học viên
    return (
      <div className="flex justify-end mb-4 px-2">
        <div className="max-w-[85%] bg-amber-500 text-white rounded-3xl rounded-tr-sm px-4 py-3 shadow-sm">
          <div className="text-xs text-amber-100 font-medium mb-0.5">Bạn</div>
          <div className="hanzi-text text-lg sm:text-xl font-medium leading-relaxed">
            {message.text}
          </div>
        </div>
      </div>
    );
  }

  const evaluation = message.evaluation;

  // Tin nhắn của Gia sư Lão Sư Mei
  return (
    <div className="flex flex-col mb-5 px-2">
      <div className="flex items-start gap-2.5 max-w-[96%]">
        {/* Avatar Lão Sư Mei */}
        <div className="w-10 h-10 rounded-2xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-xs">
          美
        </div>

        {/* Nội dung phản hồi */}
        <div className="flex-1 bg-white rounded-3xl rounded-tl-sm p-4 shadow-sm border border-stone-200/80">
          <div className="text-xs font-semibold text-red-700 flex items-center justify-between mb-2">
            <span>Lão Sư Mei (美老师)</span>
            {isPlayingThis && (
              <span className="inline-flex items-center gap-1 text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                <Volume2 className="w-3 h-3" /> Đang nói...
              </span>
            )}
          </div>

          {/* BƯỚC 1: KIỂM TRA ĐÚNG / SAI HOẶC DẠY CÂU TIẾNG TRUNG TRƯỚC */}
          {evaluation && (
            <div className="mb-3.5">
              {/* 1.1 Trường hợp NÓI SAI hoặc CHƯA TỰ NHIÊN: Sửa lỗi ngay trước */}
              {evaluation.type === 'needs_correction' && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-stone-800 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700 mb-1 text-sm">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Lão Sư Mei sửa lỗi cho bạn trước:</span>
                  </div>
                  <p className="text-stone-700 mb-2 leading-relaxed font-medium">
                    {evaluation.praiseOrCorrectionVi}
                  </p>
                  {evaluation.correctedHanzi && (
                    <div className="p-2.5 rounded-xl bg-white border border-rose-200">
                      <div className="text-[11px] text-stone-500 font-medium mb-0.5">Câu chuẩn nên nói:</div>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="hanzi-text text-xl font-bold text-rose-950">
                            {evaluation.correctedHanzi}
                          </div>
                          {evaluation.correctedPinyin && (
                            <div className="text-xs text-amber-700 font-semibold mt-0.5">
                              {evaluation.correctedPinyin}
                            </div>
                          )}
                          {evaluation.correctedVietnamese && (
                            <div className="text-[11px] text-stone-600 italic">
                              "{evaluation.correctedVietnamese}"
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onSpeak(evaluation.correctedHanzi!, 0.85)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center gap-1 text-xs font-bold flex-shrink-0 transition-colors"
                          title="Nghe câu chuẩn"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Nghe câu sửa</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 1.2 Trường hợp NÓI ĐÚNG: Khen ngợi rõ ràng */}
              {evaluation.type === 'correct' && (
                <div className="px-3 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{evaluation.praiseOrCorrectionVi}</span>
                </div>
              )}

              {/* 1.3 Trường hợp NÓI TIẾNG VIỆT: Dạy câu tiếng Trung tương ứng */}
              {evaluation.type === 'vietnamese_help' && (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-stone-800 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-700 mb-1 text-sm">
                    <span>🇻🇳 Lão Sư Mei hướng dẫn câu tiếng Trung tương ứng:</span>
                  </div>
                  <p className="text-stone-700 mb-2 leading-relaxed font-medium">
                    {evaluation.praiseOrCorrectionVi}
                  </p>
                  {evaluation.correctedHanzi && (
                    <div className="p-2.5 rounded-xl bg-white border border-blue-200 mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="hanzi-text text-xl font-bold text-blue-950">
                            {evaluation.correctedHanzi}
                          </div>
                          {evaluation.correctedPinyin && (
                            <div className="text-xs text-amber-700 font-semibold mt-0.5">
                              {evaluation.correctedPinyin}
                            </div>
                          )}
                          {evaluation.correctedVietnamese && (
                            <div className="text-[11px] text-stone-600 italic">
                              "{evaluation.correctedVietnamese}"
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onSpeak(evaluation.correctedHanzi!, 0.85)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 flex items-center gap-1 text-xs font-bold flex-shrink-0 transition-colors"
                          title="Nghe câu mẫu"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Nghe mẫu</span>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="text-[11px] text-blue-800 font-semibold">
                    👉 Hãy chuyển mic sang tiếng Trung bên dưới để luyện đọc câu này nhé!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BƯỚC 2: CÂU TRÒ CHUYỆN TIẾP THEO CỦA AI */}
          <div>
            {evaluation?.type === 'needs_correction' && (
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                💬 Cuộc trò chuyện tiếp tục:
              </div>
            )}

            {/* Chữ Hán to rõ */}
            <div className="hanzi-text text-2xl sm:text-3xl font-bold text-stone-900 leading-snug tracking-wide mb-1">
              {message.text}
            </div>

            {/* Pinyin có dấu thanh */}
            {settings.showPinyin && message.pinyin && (
              <div className="text-sm sm:text-base font-medium text-amber-700 mb-1">
                {message.pinyin}
              </div>
            )}

            {/* Nghĩa tiếng Việt */}
            {settings.showVietnamese && message.vietnamese && (
              <div className="text-xs sm:text-sm text-stone-600 italic mb-2">
                "{message.vietnamese}"
              </div>
            )}

            {/* Nút nghe lại & nghe chậm */}
            <div className="flex items-center gap-2 pt-1 border-t border-stone-100 mt-2">
              <button
                type="button"
                onClick={() => onSpeak(message.text, 1.0)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors active:scale-95"
              >
                <Volume2 className="w-3.5 h-3.5 text-stone-600" />
                <span>Nghe lại</span>
              </button>

              <button
                type="button"
                onClick={() => onSpeak(message.text, 0.75)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium transition-colors active:scale-95"
              >
                <Snail className="w-3.5 h-3.5 text-amber-600" />
                <span>Nghe chậm</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

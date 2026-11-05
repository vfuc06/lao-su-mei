import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Scenario, HSKLevel, UserSettings, ChatMessage, WordItem, Suggestion } from '../types';
import { Header } from '../components/Header';
import { ChatBubble } from '../components/ChatBubble';
import { SuggestionsBar } from '../components/SuggestionsBar';
import { MicButton } from '../components/MicButton';
import { SettingsSheet } from '../components/SettingsSheet';
import { SummaryModal } from '../components/SummaryModal';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { sendChatMessage } from '../lib/api';
import { AlertCircle, RefreshCw, X, Send } from 'lucide-react';

interface ConversationScreenProps {
  scenario: Scenario;
  level: HSKLevel;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onBackToHome: () => void;
}

export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  scenario,
  level,
  settings,
  onUpdateSettings,
  onBackToHome,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastFailedInput, setLastFailedInput] = useState<{ text: string; lang: 'zh' | 'vi' } | null>(null);

  // Ngôn ngữ thu âm hiện tại của Micro: 'zh-CN' (mặc định) hoặc 'vi-VN' (khi cần hỏi bằng tiếng Việt)
  const [speechLang, setSpeechLang] = useState<'zh-CN' | 'vi-VN'>('zh-CN');

  // Gợi ý phản hồi và từ mới tích luỹ trong buổi học
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [accumulatedWords, setAccumulatedWords] = useState<WordItem[]>([]);

  // Trạng thái modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isTextInputOpen, setIsTextInputOpen] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [isIOSStandalone, setIsIOSStandalone] = useState(false);
  const [showIOSHelpModal, setShowIOSHelpModal] = useState(false);

  useEffect(() => {
    try {
      const isStandalone =
        (window.navigator as any).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS && isStandalone) {
        setIsIOSStandalone(true);
      }
    } catch (e) {}
  }, []);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Hook phát âm (TTS)
  const {
    speak,
    stop: stopSpeaking,
    isPlaying: isSpeechPlaying,
    currentText: playingText,
    voices,
  } = useSpeechSynthesis({
    defaultRate: settings.speechRate,
  });

  // Tự động cuộn xuống cuối khung chat
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Hàm gửi tin nhắn tới API và xử lý kết quả
  const handleSendMessage = useCallback(
    async (userInputText: string, inputLang: 'zh' | 'vi' = 'zh') => {
      if (isLoading) return;

      const trimmed = userInputText.trim();
      const isInit = trimmed === '__INIT__';

      if (!isInit && !trimmed) return;

      // Dừng âm thanh đang đọc (nếu có)
      stopSpeaking();
      setErrorBanner(null);
      setLastFailedInput(null);

      // Thêm tin nhắn của học viên vào danh sách (nếu không phải là init)
      if (!isInit) {
        const userMsg: ChatMessage = {
          id: 'user-' + Date.now(),
          role: 'user',
          text: trimmed,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
        scrollToBottom();
      }

      setIsLoading(true);

      // Chuẩn bị lịch sử hội thoại rút gọn gửi lên server
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      try {
        const data = await sendChatMessage({
          scenarioId: scenario.id,
          level,
          correctionMode: settings.correctionMode,
          history: historyPayload,
          userInput: trimmed,
          inputLang,
        });

        // Tạo tin nhắn phản hồi của Lão Sư Mei (có chứa phần đánh giá/sửa lỗi trước)
        const aiMsg: ChatMessage = {
          id: 'ai-' + Date.now(),
          role: 'ai',
          text: data.reply.hanzi,
          pinyin: data.reply.pinyin,
          vietnamese: data.reply.vietnamese,
          evaluation: data.evaluation,
          feedback: data.feedback,
          suggestions: data.suggestions,
          newWords: data.newWords,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMsg]);
        setSuggestions(data.suggestions || []);

        // Tích luỹ từ mới nếu có
        if (data.newWords && data.newWords.length > 0) {
          setAccumulatedWords((prev) => [...prev, ...data.newWords]);
        }

        // Nếu học viên vừa hỏi bằng tiếng Việt và Mei đã chỉ câu tiếng Trung tương ứng,
        // tự động chuyển mic về tiếng Trung để học viên luyện đọc câu đó ngay
        if (data.evaluation?.type === 'vietnamese_help') {
          setSpeechLang('zh-CN');
        }

        scrollToBottom();

        // Tự động phát âm câu tiếng Trung (nếu là dạy câu mới hoặc sửa lỗi thì đọc câu chuẩn đó)
        if (settings.autoPlaySpeech) {
          const textToSpeak =
            data.evaluation?.type === 'vietnamese_help' && data.evaluation?.correctedHanzi
              ? data.evaluation.correctedHanzi
              : data.evaluation?.type === 'needs_correction' && data.evaluation?.correctedHanzi
              ? data.evaluation.correctedHanzi
              : data.reply.hanzi;

          if (textToSpeak) {
            speak(textToSpeak, settings.speechRate);
          }
        }
      } catch (err: any) {
        console.error('Lỗi hội thoại:', err);
        const errMsg = err?.message || 'Có lỗi xảy ra khi kết nối với Lão Sư Mei.';
        setErrorBanner(errMsg);
        if (!isInit) {
          setLastFailedInput({ text: trimmed, lang: inputLang });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, scenario.id, level, settings.correctionMode, settings.autoPlaySpeech, settings.speechRate, speak, stopSpeaking]
  );

  // Hook nhận diện giọng nói (STT)
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: isSTTSupported,
    errorMessage: sttError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: speechLang,
    silenceTimeoutMs: 1500,
    onResult: (spokenFinal, spokenLang) => {
      if (spokenFinal.trim()) {
        const isVi =
          spokenLang === 'vi-VN' ||
          /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(spokenFinal);
        handleSendMessage(spokenFinal, isVi ? 'vi' : 'zh');
      }
    },
    onError: (msg) => {
      setErrorBanner(msg);
    },
  });

  // Tự động khởi tạo hội thoại khi vừa bước vào phòng (AI chào trước)
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      handleSendMessage('__INIT__', 'zh');
    }
  }, [handleSendMessage]);

  // Đổi trạng thái Mic
  const handleToggleMic = () => {
    if (isIOSStandalone) {
      setShowIOSHelpModal(true);
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      if (isSpeechPlaying) {
        stopSpeaking();
        // Cho iOS audio session 150ms để giải phóng trước khi bật mic
        setTimeout(() => {
          startListening(speechLang);
        }, 150);
      } else {
        startListening(speechLang);
      }
    }
  };

  // Phát lại âm thanh theo yêu cầu
  const handleSpeakText = (text: string, rateMultiplier: number = 1.0) => {
    speak(text, settings.speechRate * rateMultiplier);
  };

  // Chọn câu gợi ý để gửi
  const handleSelectSuggestion = (hanzi: string) => {
    handleSendMessage(hanzi, 'zh');
  };

  // Bắt đầu lại hội thoại
  const handleResetConversation = () => {
    stopSpeaking();
    stopListening();
    setMessages([]);
    setSuggestions([]);
    setAccumulatedWords([]);
    setErrorBanner(null);
    setLastFailedInput(null);
    handleSendMessage('__INIT__', 'zh');
  };

  // Gửi qua chế độ gõ phím dự phòng
  const handleSubmitTextInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInputValue.trim()) return;

    const val = textInputValue.trim();
    setTextInputValue('');
    setIsTextInputOpen(false);

    const isVietnamese =
      speechLang === 'vi-VN' ||
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(val);
    handleSendMessage(val, isVietnamese ? 'vi' : 'zh');
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-stone-50 overflow-hidden select-none">
      {/* Header cố định phía trên */}
      <Header
        scenario={scenario}
        level={level}
        onBack={onBackToHome}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onFinishSession={() => setIsSummaryOpen(true)}
      />

      {/* Cảnh báo riêng cho người dùng iPhone mở từ màn hình chính */}
      {isIOSStandalone && (
        <div className="bg-amber-600 text-white px-3 py-2 text-xs flex items-center justify-between shadow-sm z-20">
          <span className="leading-tight pr-2">
            📱 <b>Lưu ý iPhone:</b> Apple chặn Micro khi mở từ Màn hình chính. Hãy mở trên tab <b>Safari</b> để nói chuyện!
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-white text-amber-900 rounded-lg font-bold text-[11px] shadow-xs active:scale-95 inline-block"
            >
              Mở Safari
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Đã chép link! Hãy mở Safari và dán vào thanh địa chỉ nhé.');
              }}
              className="px-2 py-1 bg-amber-800 text-amber-100 rounded-lg font-semibold text-[11px] active:scale-95"
            >
              Chép link
            </button>
          </div>
        </div>
      )}

      {/* Thông báo lỗi / Quota / Mic nếu có */}
      {(errorBanner || sttError) && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center justify-between text-xs text-rose-800 animate-fade-in z-10">
          <div className="flex items-center gap-2 flex-1 pr-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="leading-snug">{errorBanner || sttError}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {lastFailedInput && (
              <button
                type="button"
                onClick={() => handleSendMessage(lastFailedInput.text, lastFailedInput.lang)}
                className="px-2 py-1 rounded-md bg-rose-200/80 hover:bg-rose-300 font-bold text-rose-900 inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Thử lại
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setErrorBanner(null);
              }}
              className="p-1 text-rose-500 hover:text-rose-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Khung chat tin nhắn (cuộn được) */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-1"
      >
        {/* Lời dẫn mở đầu tình huống */}
        <div className="max-w-md mx-auto mb-4 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900 text-center">
          <div className="font-bold mb-0.5">🎯 Mục tiêu: {scenario.goalVi}</div>
          <div className="text-stone-600 italic">{scenario.openingHint}</div>
        </div>

        {/* Danh sách các câu đối thoại */}
        <div className="max-w-md mx-auto">
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              settings={settings}
              isPlayingThis={isSpeechPlaying && playingText === msg.text}
              onSpeak={handleSpeakText}
            />
          ))}

          {/* Dấu ba chấm khi AI đang suy nghĩ */}
          {isLoading && (
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className="w-9 h-9 rounded-2xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center font-bold text-sm">
                美
              </div>
              <div className="bg-white rounded-3xl p-3.5 shadow-sm border border-stone-200 flex items-center gap-1.5 text-stone-400">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse delay-150" />
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse delay-300" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thanh gợi ý câu trả lời nhanh (nếu học viên bí từ) */}
      <div className="max-w-md mx-auto w-full">
        <SuggestionsBar
          suggestions={suggestions}
          onSelectSuggestion={handleSelectSuggestion}
          onPreviewSpeak={(hanzi) => handleSpeakText(hanzi, 0.9)}
          isLoading={isLoading}
        />
      </div>

      {/* VÙNG MIC NÓI CHUYỆN TO Ở ĐÁY MÀN HÌNH (CÓ NÚT CHUYỂN TIẾNG TRUNG / TIẾNG VIỆT) */}
      <div className="max-w-md mx-auto w-full">
        <MicButton
          isListening={isListening}
          isLoading={isLoading}
          interimTranscript={interimTranscript}
          transcript={transcript}
          onToggleMic={handleToggleMic}
          onSwitchToText={() => setIsTextInputOpen(true)}
          isSupported={isSTTSupported}
          speechLang={speechLang}
          onSelectSpeechLang={setSpeechLang}
        />
      </div>

      {/* Modal/Khay gõ chữ dự phòng khi không dùng được mic */}
      {isTextInputOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-700">
                ⌨️ Gõ chữ ({speechLang === 'vi-VN' ? 'Tiếng Việt' : 'Tiếng Trung'})
              </span>
              <button
                type="button"
                onClick={() => setIsTextInputOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTextInput} className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                placeholder={
                  speechLang === 'vi-VN'
                    ? 'Gõ tiếng Việt (ví dụ: "cho tôi hỏi giá bao nhiêu")...'
                    : 'Gõ tiếng Trung (ví dụ: 你好, 我要一杯咖啡)...'
                }
                className="flex-1 p-3 rounded-2xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={!textInputValue.trim() || isLoading}
                className="px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-bold text-sm flex items-center justify-center transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal hướng dẫn khắc phục lỗi micro trên iPhone khi mở từ Màn hình chính */}
      {showIOSHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3 text-2xl">
                📱
              </div>
              <h3 className="text-base font-bold text-stone-900">
                Lưu ý Micro trên iPhone
              </h3>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                Apple <b>không cấp quyền micro</b> cho bất kỳ trang web nào khi mở từ <b>Màn hình chính</b> (Add to Home Screen).
              </p>
            </div>

            <div className="bg-amber-50/80 rounded-2xl p-3 border border-amber-200/80 text-xs text-stone-700 space-y-1.5">
              <div className="font-bold text-amber-950">👉 Cách để nói chuyện bình thường:</div>
              <p>1. Mở ứng dụng <b>Safari</b> trên iPhone.</p>
              <p>2. Dán link trang web vào Safari và bấm Go.</p>
              <p>3. Trong Safari: Bấm nút <b>Chia sẻ</b> (hình vuông mũi tên lên) &gt; Chọn <b>"Thêm dấu trang"</b> (Bookmark) để lưu lại thay vì ghim ra màn hình chính.</p>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm text-center block shadow-md active:scale-98 transition-transform"
              >
                Mở trong Safari ngay
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Đã chép link! Bạn hãy mở Safari và dán vào thanh địa chỉ nhé.');
                }}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl font-semibold text-xs active:scale-98 transition-colors"
              >
                Sao chép link web
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowIOSHelpModal(false);
                  setIsTextInputOpen(true);
                }}
                className="w-full py-2 text-stone-500 font-medium text-xs hover:text-stone-800"
              >
                Tôi muốn tiếp tục bằng cách Gõ chữ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet cài đặt */}
      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onResetChat={handleResetConversation}
        availableVoices={voices}
      />

      {/* Modal tổng kết buổi học */}
      <SummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        onReturnHome={onBackToHome}
        turnCount={messages.filter((m) => m.role === 'user').length}
        newWords={accumulatedWords}
        onSpeakWord={(w) => handleSpeakText(w, 0.9)}
      />
    </div>
  );
};

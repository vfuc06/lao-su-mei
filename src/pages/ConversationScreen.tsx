import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scenario,
  HSKLevel,
  UserSettings,
  ChatMessage,
  WordItem,
  Suggestion,
  ZhLine,
  CorrectionChunk,
  ScoreOutput,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { ChatBubble } from '../components/ChatBubble';
import { SuggestionsBar } from '../components/SuggestionsBar';
import { MicButton } from '../components/MicButton';
import { SettingsSheet } from '../components/SettingsSheet';
import { SummaryModal } from '../components/SummaryModal';
import { CorrectionCard } from '../components/CorrectionCard';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { evaluatePronunciation } from '../lib/scoring';
import { sendChatMessage } from '../lib/api';
import { playZhAudio, stopZhAudio, subscribeAudioState } from '../lib/audio';
import {
  AlertCircle,
  RefreshCw,
  X,
  Send,
  Lightbulb,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface ConversationScreenProps {
  scenario: Scenario;
  level: HSKLevel;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onBackToHome: () => void;
}

interface ActiveCorrectionGate {
  userSaid: string;
  explanationVi: string;
  directionVi?: string;
  correctSentence: ZhLine;
  chunks: CorrectionChunk[];
  attempts: number;
  lastScore: ScoreOutput | null;
  heardText: string;
}

export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  scenario,
  level,
  settings,
  onUpdateSettings,
  onBackToHome,
}) => {
  const { user } = useAuth();

  // Danh sách tin nhắn hội thoại
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastFailedInput, setLastFailedInput] = useState<{ text: string; lang: 'zh' | 'vi' } | null>(null);

  // Ngôn ngữ thu âm hiện tại của Micro: 'zh-CN' (mặc định) hoặc 'vi-VN'
  const [speechLang, setSpeechLang] = useState<'zh-CN' | 'vi-VN'>('zh-CN');

  // Gợi ý phản hồi và từ mới tích luỹ
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [accumulatedWords, setAccumulatedWords] = useState<WordItem[]>([]);

  // TRẠNG THÁI GIA SƯ NGHIÊM: Kẹt ở Thẻ Sửa Lỗi cho đến khi đạt điểm ≥ 80%
  const [correctionGate, setCorrectionGate] = useState<ActiveCorrectionGate | null>(null);
  const [isResumingAfterCorrection, setIsResumingAfterCorrection] = useState(false);

  // Gợi ý thông minh khi bí từ (3 cấp)
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [smartHintText, setSmartHintText] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState<boolean>(false);

  // Phiên hội thoại trên Supabase (chat_sessions)
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Trạng thái modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isTextInputOpen, setIsTextInputOpen] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [isIOSStandalone, setIsIOSStandalone] = useState(false);
  const [showIOSHelpModal, setShowIOSHelpModal] = useState(false);

  // Điều chỉnh độ khó: 'easier' | 'harder'
  const [difficultyBias, setDifficultyBias] = useState<'normal' | 'easier' | 'harder'>('normal');

  // Trạng thái phát âm của tin nhắn hiện tại
  const [speakingAudioText, setSpeakingAudioText] = useState<string | null>(null);

  useEffect(() => {
    return subscribeAudioState((isPlaying, text) => {
      setSpeakingAudioText(isPlaying ? text : null);
    });
  }, []);

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

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 120);
  };

  // Khởi tạo session trong bảng chat_sessions trên Supabase
  useEffect(() => {
    const initSession = async () => {
      if (user && isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('chat_sessions')
            .insert({
              user_id: user.id,
              mode: scenario.mode,
              scenario: scenario.id,
              started_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (data?.id) {
            setSessionId(data.id);
          }
        } catch (e) {
          console.warn('Lỗi tạo chat_session:', e);
        }
      }
    };
    initSession();
  }, [user, scenario.id, scenario.mode]);

  // Lưu tin nhắn vào chat_turns trên Supabase
  const persistChatTurn = async (role: 'user' | 'ai', content: any) => {
    if (user && sessionId && isSupabaseConfigured) {
      try {
        await supabase.from('chat_turns').insert({
          session_id: sessionId,
          user_id: user.id,
          role,
          content,
        });
      } catch (e) {
        console.warn('Lỗi lưu chat_turn:', e);
      }
    }
  };

  // Tiếp tục cuộc hội thoại sau khi sửa lỗi thành công (Action: 'resume')
  const handleResumeConversation = useCallback(
    async (targetSentence: string) => {
      setIsLoading(true);
      setCorrectionGate(null);
      setIsResumingAfterCorrection(true);
      stopSpeaking();

      // Chuẩn bị lịch sử hội thoại
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      try {
        const data = await sendChatMessage({
          action: 'resume',
          scenarioId: scenario.id,
          strictness: settings.strictness,
          history: historyPayload,
          correctedSentence: targetSentence,
        });

        const aiMsg: ChatMessage = {
          id: 'ai-' + Date.now(),
          role: 'ai',
          text: data.reply.hanzi,
          pinyin: data.reply.pinyin,
          vietnamese: data.reply.vietnamese,
          praiseVi: data.praiseVi || 'Chuẩn rồi! Đi tiếp nhé 🎉',
          suggestions: data.suggestions,
          newWords: data.newWords,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMsg]);
        setSuggestions(data.suggestions || []);
        if (data.newWords?.length) {
          setAccumulatedWords((prev) => [...prev, ...data.newWords]);
        }
        persistChatTurn('ai', data);

        scrollToBottom();

        if (settings.autoPlay !== false) {
          playZhAudio(data.reply.hanzi, settings.speechRate || 1.0);
        }
      } catch (err: any) {
        console.error('Lỗi khi tiếp tục hội thoại:', err);
        setErrorBanner(err?.message || 'Có lỗi xảy ra khi tiếp tục hội thoại.');
      } finally {
        setIsLoading(false);
        setIsResumingAfterCorrection(false);
      }
    },
    [messages, scenario.id, settings.strictness, settings.autoPlay, settings.speechRate, speak, stopSpeaking]
  );

  // Xử lý gửi tin nhắn thông thường
  const handleSendMessage = useCallback(
    async (userInputText: string, inputLang: 'zh' | 'vi' = 'zh') => {
      if (isLoading) return;

      const trimmed = userInputText.trim();
      const isInit = trimmed === '__INIT__';

      if (!isInit && !trimmed) return;

      stopSpeaking();
      setErrorBanner(null);
      setLastFailedInput(null);
      setSmartHintText(null);
      setHintLevel(0);

      // Thêm câu của học viên vào màn hình
      if (!isInit) {
        const userMsg: ChatMessage = {
          id: 'user-' + Date.now(),
          role: 'user',
          text: trimmed,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
        persistChatTurn('user', { text: trimmed, lang: inputLang });
        scrollToBottom();
      }

      setIsLoading(true);

      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      try {
        const data = await sendChatMessage({
          action: isInit ? 'start' : 'turn',
          scenarioId: scenario.id,
          strictness: settings.strictness,
          history: historyPayload,
          userInput: isInit ? '' : trimmed,
          inputLang,
        });

        // Hiển thị tin nhắn AI và tiếp tục cuộc đối thoại 1-1
        const aiMsg: ChatMessage = {
          id: 'ai-' + Date.now(),
          role: 'ai',
          text: data.reply?.hanzi || '',
          pinyin: data.reply?.pinyin || '',
          vietnamese: data.reply?.vietnamese || '',
          praiseVi: data.praiseVi,
          evaluation: data.evaluation,
          suggestions: data.suggestions || [],
          newWords: data.newWords || [],
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMsg]);
        setSuggestions(data.suggestions || []);
        if (data.newWords?.length) {
          setAccumulatedWords((prev) => [...prev, ...data.newWords]);
        }
        persistChatTurn('ai', data);

        scrollToBottom();

        if (settings.autoPlay !== false && aiMsg.text) {
          playZhAudio(aiMsg.text, settings.speechRate || 1.0);
        }
      } catch (err: any) {
        console.error('Lỗi hội thoại:', err);
        setErrorBanner(err?.message || 'Có lỗi xảy ra khi kết nối với Lão Sư Mei.');
        if (!isInit) {
          setLastFailedInput({ text: trimmed, lang: inputLang });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, scenario.id, settings.strictness, settings.autoPlay, settings.speechRate, speak, stopSpeaking]
  );

  // Chấm điểm câu học viên nói lại trong Thẻ Sửa Lỗi (HOÀN TOÀN TẠI CLIENT - 0 QUOTA DÙNG)
  const handleGradeCorrectionAttempt = (spokenText: string) => {
    if (!correctionGate) return;

    const targetHanzi = correctionGate.correctSentence.hanzi;
    const threshold = settings.passThreshold || 80;
    const result = evaluatePronunciation(targetHanzi, spokenText, [], threshold);

    const newAttempts = correctionGate.attempts + 1;

    setCorrectionGate((prev) =>
      prev
        ? {
            ...prev,
            attempts: newAttempts,
            lastScore: result,
            heardText: spokenText,
          }
        : null
    );

    if (result.passed) {
      // Vượt qua gate thành công!
      setTimeout(() => {
        handleResumeConversation(targetHanzi);
      }, 700);
    }
  };

  // Bỏ qua và lưu vào sổ lỗi nếu thử nhiều lần không được
  const handleSkipToMistakes = async () => {
    if (!correctionGate) return;

    if (user && isSupabaseConfigured) {
      try {
        await supabase.from('mistakes').insert({
          user_id: user.id,
          session_id: sessionId,
          user_said: correctionGate.userSaid,
          correct_hanzi: correctionGate.correctSentence.hanzi,
          correct_pinyin: correctionGate.correctSentence.pinyin,
          correct_vi: correctionGate.correctSentence.vietnamese,
          explanation: correctionGate.explanationVi,
          attempts: correctionGate.attempts,
          best_score: correctionGate.lastScore?.score || 0,
          passed: false,
        });
      } catch (e) {
        console.warn('Lỗi lưu sổ lỗi:', e);
      }
    }

    // Tiếp tục hội thoại
    handleResumeConversation(correctionGate.correctSentence.hanzi);
  };

  // Yêu cầu gợi ý thông minh 3 cấp
  const handleRequestHint = async () => {
    const nextLevel = Math.min(3, hintLevel + 1);
    setHintLevel(nextLevel);
    setIsLoadingHint(true);

    try {
      const data = await sendChatMessage({
        action: 'hint',
        scenarioId: scenario.id,
        history: messages.map((m) => ({ role: m.role, text: m.text })),
        hintLevel: nextLevel,
      });

      if (nextLevel === 1) {
        setSmartHintText(
          data.level1Keywords?.map((k: any) => `${k.hanzi} [${k.pinyin}]: ${k.vietnamese}`).join(' · ') ||
            'Hãy chào hỏi hoặc nêu nhu cầu chính của bạn.'
        );
      } else if (nextLevel === 2) {
        setSmartHintText(
          data.level2Frame?.hanzi
            ? `Khung câu: ${data.level2Frame.hanzi} (${data.level2Frame.vietnamese})`
            : 'Hãy thử dùng mẫu câu: 我想...，请问...'
        );
      } else {
        setSmartHintText(
          data.level3Sentence?.hanzi
            ? `Câu hoàn chỉnh: ${data.level3Sentence.hanzi} [${data.level3Sentence.pinyin}] - "${data.level3Sentence.vietnamese}"`
            : 'Bạn có thể nói: 好的，我知道了，谢谢！'
        );
      }
    } catch (e) {
      setSmartHintText('Hãy mạnh dạn nói một câu ngắn đơn giản, Mei sẽ hỗ trợ bạn!');
    } finally {
      setIsLoadingHint(false);
    }
  };

  // Hook nhận diện giọng nói
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
      if (!spokenFinal.trim()) return;

      if (correctionGate) {
        // Đang ở trong Thẻ Sửa Lỗi -> Chấm điểm phát âm câu chuẩn
        handleGradeCorrectionAttempt(spokenFinal);
      } else {
        // Đang trong hội thoại thông thường
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

  // Khởi tạo lượt chào đầu tiên của AI
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      handleSendMessage('__INIT__', 'zh');
    }
  }, [handleSendMessage]);

  // Bật/tắt mic
  const handleToggleMic = () => {
    if (isIOSStandalone) {
      setShowIOSHelpModal(true);
      return;
    }
    stopZhAudio();
    stopSpeaking();
    if (isListening) {
      stopListening();
    } else {
      setTimeout(() => {
        startListening(correctionGate ? 'zh-CN' : speechLang);
      }, 100);
    }
  };

  const handleSpeakText = (text: string, rateMultiplier: number = 1.0) => {
    playZhAudio(text, (settings.speechRate || 1.0) * rateMultiplier);
  };

  const handleSubmitTextInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInputValue.trim()) return;

    const val = textInputValue.trim();
    setTextInputValue('');
    setIsTextInputOpen(false);

    if (correctionGate) {
      handleGradeCorrectionAttempt(val);
    } else {
      const isVietnamese =
        speechLang === 'vi-VN' ||
        /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(val);
      handleSendMessage(val, isVietnamese ? 'vi' : 'zh');
    }
  };

  // Kết thúc buổi học
  const handleFinishSession = async () => {
    if (sessionId && user && isSupabaseConfigured) {
      try {
        await supabase
          .from('chat_sessions')
          .update({
            ended_at: new Date().toISOString(),
            summary: {
              totalTurns: messages.length,
              accumulatedWordsCount: accumulatedWords.length,
            },
          })
          .eq('id', sessionId);
      } catch (e) {}
    }
    setIsSummaryOpen(true);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-stone-50 overflow-hidden select-none">
      {/* 1. Header cố định phía trên */}
      <Header
        scenario={scenario}
        onBack={onBackToHome}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onFinishSession={handleFinishSession}
        onAdjustDifficulty={(dir) => {
          setDifficultyBias(dir);
          alert(dir === 'easier' ? 'Đã yêu cầu Mei dùng từ đơn giản hơn!' : 'Đã yêu cầu Mei mở rộng vốn từ tự nhiên hơn!');
        }}
      />

      {/* Thông báo riêng cho iOS PWA */}
      {isIOSStandalone && (
        <div className="bg-amber-600 text-white px-3 py-2 text-xs flex items-center justify-between shadow-sm z-20">
          <span className="leading-tight pr-2">
            📱 <b>Lưu ý iPhone:</b> Apple chặn Micro khi mở từ Màn hình chính. Hãy mở trên tab <b>Safari</b> để nói chuyện!
          </span>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-white text-amber-900 rounded-lg font-bold text-[11px] shadow-xs active:scale-95 inline-block"
          >
            Mở Safari
          </a>
        </div>
      )}

      {/* Thông báo lỗi nếu có */}
      {(errorBanner || sttError) && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between text-xs text-rose-800 animate-fade-in z-10">
          <div className="flex items-center gap-2 flex-1 pr-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="leading-snug">{errorBanner || sttError}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {lastFailedInput && (
              <button
                type="button"
                onClick={() => handleSendMessage(lastFailedInput.text, lastFailedInput.lang)}
                className="px-2 py-1 rounded-md bg-rose-200/80 hover:bg-rose-300 font-bold text-rose-900 inline-flex items-center gap-1 text-[11px]"
              >
                <RefreshCw className="w-3 h-3" /> Thử lại
              </button>
            )}
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="p-1 text-rose-500 hover:text-rose-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Khung chat tin nhắn cuộn được */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 space-y-1"
      >
        {/* Banner mục tiêu bài học */}
        <div className="max-w-md mx-auto mb-3 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900 text-center">
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
              isPlayingThis={(isSpeechPlaying && playingText === msg.text) || speakingAudioText === msg.text}
              onSpeak={handleSpeakText}
            />
          ))}

          {/* THẺ SỬA LỖI (GIA SƯ NGHIÊM) KHI BỊ CHẶN */}
          {correctionGate && (
            <CorrectionCard
              userSaid={correctionGate.userSaid}
              explanationVi={correctionGate.explanationVi}
              directionVi={correctionGate.directionVi}
              correctSentence={correctionGate.correctSentence}
              chunks={correctionGate.chunks}
              attempts={correctionGate.attempts}
              passThreshold={settings.passThreshold || 80}
              lastScore={correctionGate.lastScore}
              isListening={isListening}
              heardText={correctionGate.heardText}
              onToggleMic={handleToggleMic}
              onSkipToMistakes={handleSkipToMistakes}
              onSpeak={handleSpeakText}
            />
          )}

          {/* Dấu ba chấm khi AI đang trả lời */}
          {isLoading && (
            <div className="flex items-center gap-2 mb-4 px-2 animate-fade-in">
              <div className="w-9 h-9 rounded-2xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center font-bold text-sm">
                美
              </div>
              <div className="bg-white rounded-3xl p-3.5 shadow-xs border border-stone-200 flex items-center gap-1.5 text-stone-400">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse delay-150" />
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse delay-300" />
                <span className="text-[11px] text-stone-500 font-medium ml-1">
                  {isResumingAfterCorrection ? 'Mei đang nghe câu bạn sửa...' : 'Mei đang suy nghĩ...'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Dải Gợi Ý Bí Từ 3 Cấp */}
      {!correctionGate && (
        <div className="max-w-md mx-auto w-full px-3 py-1">
          {smartHintText ? (
            <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start justify-between gap-2 shadow-2xs">
              <div className="flex items-start gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Gợi ý cấp {hintLevel}/3: </span>
                  <span>{smartHintText}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSmartHintText(null)}
                className="text-amber-700 hover:text-amber-900 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleRequestHint}
                disabled={isLoadingHint || isLoading}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-100 px-2.5 py-1 rounded-xl transition-colors active:scale-95"
              >
                <Lightbulb className="w-3 h-3 text-amber-600" />
                <span>{isLoadingHint ? 'Đang lấy gợi ý...' : '💡 Gợi ý bí từ'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Thanh gợi ý câu trả lời nhanh */}
      {!correctionGate && (
        <div className="max-w-md mx-auto w-full">
          <SuggestionsBar
            suggestions={suggestions}
            onSelectSuggestion={(hanzi) => handleSendMessage(hanzi, 'zh')}
            onPreviewSpeak={(hanzi) => handleSpeakText(hanzi, 0.9)}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* 5. Nút Mic & Chuyển Ngôn Ngữ ở đáy màn hình */}
      {!correctionGate && (
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
      )}

      {/* Modal gõ chữ dự phòng */}
      {isTextInputOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-700">
                ⌨️ Gõ chữ ({correctionGate ? 'Nói lại câu chuẩn' : speechLang === 'vi-VN' ? 'Tiếng Việt' : 'Tiếng Trung'})
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
                  correctionGate
                    ? `Nhập: ${correctionGate.correctSentence.hanzi}`
                    : speechLang === 'vi-VN'
                    ? 'Nhập câu tiếng Việt muốn hỏi...'
                    : 'Nhập chữ Hán hoặc pinyin...'
                }
                className="flex-1 px-3 py-2.5 rounded-2xl border border-stone-200 text-sm focus:outline-hidden focus:border-red-500"
              />
              <button
                type="submit"
                disabled={!textInputValue.trim()}
                className="px-4 py-2.5 rounded-2xl bg-red-600 disabled:bg-stone-200 text-white font-bold text-xs shadow-xs"
              >
                Gửi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sheet cài đặt */}
      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
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

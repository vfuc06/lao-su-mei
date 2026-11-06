import { useState, useEffect, useRef, useCallback } from 'react';

// Khai báo kiểu cho Web Speech API để TypeScript không báo lỗi
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult?: (finalTranscript: string, spokenLang: string) => void;
  onError?: (errorMessage: string) => void;
  silenceTimeoutMs?: number;
}

export function useSpeechRecognition({
  lang = 'zh-CN',
  onResult,
  onError,
  silenceTimeoutMs = 1400,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quản lý instance và số định danh phiên để tránh xung đột giữa các lượt mở mic liên tiếp
  const recognitionRef = useRef<any>(null);
  const sessionCounterRef = useRef<number>(0);
  const silenceTimerRef = useRef<any>(null);
  const maxDurationTimerRef = useRef<any>(null);

  // Bộ đệm văn bản thu âm
  const finalTranscriptRef = useRef('');
  const lastInterimRef = useRef('');
  const hasSentRef = useRef(false);
  const currentLangRef = useRef(lang);

  // Giữ callback references ổn định
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    currentLangRef.current = lang;
  }, [lang]);

  // Kiểm tra hỗ trợ trình duyệt
  useEffect(() => {
    const win = window as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const clearTimers = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  };

  // Lấy toàn bộ văn bản đã thu được trong phiên
  const getFullSpokenText = () => {
    const final = finalTranscriptRef.current.trim();
    const interim = lastInterimRef.current.trim();
    if (final && interim) {
      return final.includes(interim) ? final : `${final} ${interim}`;
    }
    return final || interim || '';
  };

  // Gửi kết quả duy nhất 1 lần cho mỗi phiên
  const sendResultOnce = useCallback((spokenLang: string) => {
    if (hasSentRef.current) return;
    const fullText = getFullSpokenText().trim();
    if (fullText) {
      hasSentRef.current = true;
      onResultRef.current?.(fullText, spokenLang);
    }
  }, []);

  // Dừng thu âm an toàn & dọn dẹp triệt để
  const stopListening = useCallback(() => {
    clearTimers();
    setIsListening(false);

    const prev = recognitionRef.current;
    if (prev) {
      try {
        // Gỡ bỏ listeners trước khi stop để không bị callback muộn đè lên phiên mới
        prev.onstart = null;
        prev.onresult = null;
        prev.onerror = null;
        prev.onend = null;
        prev.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    sendResultOnce(currentLangRef.current);
  }, [sendResultOnce]);

  // Bắt đầu thu âm (hỗ trợ bấm liên tục nhiều lần không bao giờ bị khóa)
  const startListening = useCallback(
    (overrideLang?: string) => {
      const win = window as IWindow;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
        const msg = 'Trình duyệt này không hỗ trợ nhận diện giọng nói trực tiếp. Hãy dùng Google Chrome hoặc Safari nhé!';
        setErrorMessage(msg);
        onErrorRef.current?.(msg);
        return;
      }

      const activeLang = overrideLang || currentLangRef.current || 'zh-CN';
      currentLangRef.current = activeLang;

      // 1. Tăng ID phiên để cô lập hoàn toàn phiên mới khỏi mọi sự kiện của instance cũ
      const sessionId = ++sessionCounterRef.current;

      // 2. Dọn dẹp phiên cũ nếu còn đang mở dở
      clearTimers();
      if (recognitionRef.current) {
        try {
          const prev = recognitionRef.current;
          prev.onstart = null;
          prev.onresult = null;
          prev.onerror = null;
          prev.onend = null;
          prev.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }

      // 3. Reset các bộ đệm
      setErrorMessage(null);
      setTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      lastInterimRef.current = '';
      hasSentRef.current = false;

      // 4. Giới hạn tối đa 12 giây để bảo vệ micro khỏi bị treo
      maxDurationTimerRef.current = setTimeout(() => {
        if (sessionId === sessionCounterRef.current) {
          stopListening();
        }
      }, 12000);

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = activeLang;
        // Bật continuous = true để người học có đủ thời gian chuẩn bị và suy nghĩ câu nói
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          if (sessionId !== sessionCounterRef.current) return;
          setIsListening(true);
          setErrorMessage(null);
        };

        recognition.onresult = (event: any) => {
          if (sessionId !== sessionCounterRef.current) return;

          let interim = '';
          let currentFinal = finalTranscriptRef.current;

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              currentFinal += item[0].transcript;
            } else {
              interim += item[0].transcript;
            }
          }

          finalTranscriptRef.current = currentFinal;
          lastInterimRef.current = interim;
          setTranscript(currentFinal);
          setInterimTranscript(interim);

          // Phát hiện im lặng sau khi người dùng đã nói ít nhất 1 âm
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          const currentSpoken = (currentFinal + ' ' + interim).trim();
          if (currentSpoken.length > 0) {
            silenceTimerRef.current = setTimeout(() => {
              if (sessionId === sessionCounterRef.current) {
                stopListening();
              }
            }, silenceTimeoutMs);
          }
        };

        recognition.onerror = (event: any) => {
          if (sessionId !== sessionCounterRef.current) return;
          console.warn('Speech recognition error:', event.error);

          if (event.error === 'aborted') {
            return;
          }

          clearTimers();
          setIsListening(false);

          if (event.error === 'no-speech') {
            // Người dùng bấm mic nhưng chưa kịp nói, tắt êm dịu không báo lỗi đỏ
            return;
          }

          let vietnameseMsg = 'Có lỗi nhận diện âm thanh.';
          if (event.error === 'service-not-allowed') {
            vietnameseMsg = 'Apple iOS chặn tính năng micro khi ghim vào Màn hình chính. Bạn hãy mở link trực tiếp bằng tab Safari hoặc Chrome nhé!';
          } else if (event.error === 'audio-capture') {
            vietnameseMsg = 'Không thể kết nối với micro. Hãy kiểm tra: Cài đặt iPhone > Safari > Micro > Bật Cho phép nhé!';
          } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            vietnameseMsg = 'Microphone chưa được cấp quyền! Trên iPhone: Vào Cài đặt > Safari > Micro > Chọn "Cho phép".';
          } else if (event.error === 'network') {
            vietnameseMsg = 'Mạng nhận diện giọng nói bị gián đoạn. Hãy kiểm tra kết nối Wifi/4G nhé!';
          }

          setErrorMessage(vietnameseMsg);
          onErrorRef.current?.(vietnameseMsg);
        };

        recognition.onend = () => {
          if (sessionId !== sessionCounterRef.current) return;
          setIsListening(false);
          clearTimers();
          sendResultOnce(currentLangRef.current);
          if (recognitionRef.current === recognition) {
            recognitionRef.current = null;
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.error('Failed to start speech recognition:', err);
        clearTimers();
        setIsListening(false);

        // Xử lý xung đột tài nguyên micro trên Webkit
        const msg = 'Không thể mở micro: ' + (err?.message || 'Vui lòng kiểm tra quyền truy cập');
        setErrorMessage(msg);
        onErrorRef.current?.(msg);
      }
    },
    [silenceTimeoutMs, stopListening, sendResultOnce]
  );

  // Dọn dẹp khi unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (recognitionRef.current) {
        try {
          const prev = recognitionRef.current;
          prev.onstart = null;
          prev.onresult = null;
          prev.onerror = null;
          prev.onend = null;
          prev.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
  };
}

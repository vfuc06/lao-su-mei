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
  silenceTimeoutMs = 1200,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const maxDurationTimerRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const lastInterimRef = useRef('');
  const hasSentRef = useRef(false);
  const currentLangRef = useRef(lang);

  // Sử dụng ref cho callbacks để giữ startListening / stopListening có identity ổn định
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Cập nhật ref khi prop lang thay đổi
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

  // Lấy toàn bộ văn bản đã thu được
  const getFullSpokenText = () => {
    const final = finalTranscriptRef.current.trim();
    const interim = lastInterimRef.current.trim();
    if (final && interim) {
      return final.includes(interim) ? final : `${final} ${interim}`;
    }
    return final || interim || '';
  };

  // Hàm gửi kết quả duy nhất 1 lần cho mỗi lượt nói
  const sendResultOnce = useCallback((spokenLang: string) => {
    if (hasSentRef.current) return;
    const fullText = getFullSpokenText().trim();
    if (fullText) {
      hasSentRef.current = true;
      onResultRef.current?.(fullText, spokenLang);
    }
  }, []);

  // Dừng thu âm an toàn & dọn dẹp triệt để instance cũ
  const stopListening = useCallback(() => {
    clearTimers();
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        const r = recognitionRef.current;
        // Gỡ bỏ listeners để instance cũ không phát sinh sự kiện đè lên lượt mới
        r.onstart = null;
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        r.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    sendResultOnce(currentLangRef.current);
  }, [sendResultOnce]);

  // Bắt đầu thu âm lượt mới (Mở mic nhiều lần liên tiếp không bao giờ bị khóa)
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

      // 1. Dọn dẹp triệt để bất kỳ instance nào đang chạy trước đó
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

      // 2. Reset trạng thái đệm
      setErrorMessage(null);
      setTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      lastInterimRef.current = '';
      hasSentRef.current = false;

      // 3. Giới hạn thời gian thu âm tối đa 8.5s cho mỗi lần bấm mic để tránh treo
      maxDurationTimerRef.current = setTimeout(() => {
        stopListening();
      }, 8500);

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = activeLang;
        // QUAN TRỌNG: continuous = false để tương thích 100% với iOS Safari & Android Webview
        // Tránh tình trạng iOS giữ khóa microphone không cho mở lại lần 2
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
        };

        recognition.onresult = (event: any) => {
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

          // Phát hiện im lặng sau khi người dùng đã nói
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          const currentSpoken = (currentFinal + ' ' + interim).trim();
          if (currentSpoken.length > 0) {
            silenceTimerRef.current = setTimeout(() => {
              stopListening();
            }, silenceTimeoutMs);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          clearTimers();

          if (event.error === 'aborted') {
            return;
          }

          let vietnameseMsg = 'Có lỗi nhận diện âm thanh.';
          if (event.error === 'service-not-allowed') {
            vietnameseMsg = 'Apple iOS chặn tính năng micro khi ghim vào Màn hình chính. Bạn hãy mở link trực tiếp bằng tab trình duyệt Safari hoặc Chrome nhé!';
          } else if (event.error === 'audio-capture') {
            vietnameseMsg = 'Không thể kết nối với micro. Hãy kiểm tra: Cài đặt iPhone > Safari > Micro > Bật Cho phép nhé!';
          } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            vietnameseMsg = 'Microphone chưa được cấp quyền! Trên iPhone: Vào Cài đặt > Safari > Micro > Chọn "Cho phép".';
          } else if (event.error === 'no-speech') {
            vietnameseMsg = 'Không nghe thấy tiếng nói. Hãy thử bấm lại và nói to hơn nhé!';
          } else if (event.error === 'network') {
            vietnameseMsg = 'Mạng nhận diện giọng nói bị gián đoạn. Hãy kiểm tra kết nối Wifi/4G nhé!';
          }

          setErrorMessage(vietnameseMsg);
          onErrorRef.current?.(vietnameseMsg);
        };

        recognition.onend = () => {
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
        setIsListening(false);
        clearTimers();

        // Nếu lỗi do instance trước đang giải phóng, thử lại sau 200ms
        if (err?.name === 'InvalidStateError') {
          setTimeout(() => {
            try {
              if (!recognitionRef.current) {
                const retryRec = new SpeechRecognition();
                retryRec.lang = activeLang;
                retryRec.continuous = false;
                retryRec.interimResults = true;
                retryRec.onstart = () => setIsListening(true);
                retryRec.onend = () => setIsListening(false);
                recognitionRef.current = retryRec;
                retryRec.start();
              }
            } catch (retryErr) {
              console.warn('Retry recognition failed:', retryErr);
            }
          }, 200);
          return;
        }

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
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
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

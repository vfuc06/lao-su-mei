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
  silenceTimeoutMs = 1500,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const currentLangRef = useRef(lang);

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

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // bỏ qua lỗi nếu đã dừng
      }
    }
    setIsListening(false);

    // Gửi kết quả cuối cùng nếu có
    const currentFinal = finalTranscriptRef.current.trim();
    if (currentFinal && onResult) {
      onResult(currentFinal, currentLangRef.current);
      finalTranscriptRef.current = '';
    }
  }, [onResult]);

  const startListening = useCallback((overrideLang?: string) => {
    const win = window as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      const msg = 'Trình duyệt này không hỗ trợ nhận diện giọng nói trực tiếp. Hãy dùng Google Chrome hoặc Safari nhé!';
      setErrorMessage(msg);
      onError?.(msg);
      return;
    }

    const activeLang = overrideLang || currentLangRef.current || 'zh-CN';
    currentLangRef.current = activeLang;

    setErrorMessage(null);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    isManuallyStoppedRef.current = false;
    clearSilenceTimer();

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Bỏ qua
        }
      }

      const recognition = new SpeechRecognition();
      recognition.lang = activeLang;
      recognition.continuous = true;
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
        setTranscript(currentFinal);
        setInterimTranscript(interim);

        // Phát hiện im lặng: Nếu người dùng đã nói được câu và im lặng sau silenceTimeoutMs thì tự dừng và gửi
        clearSilenceTimer();
        const fullSpoken = (currentFinal + ' ' + interim).trim();
        if (fullSpoken.length > 0) {
          silenceTimerRef.current = setTimeout(() => {
            stopListening();
          }, silenceTimeoutMs);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        let vietnameseMsg = 'Có lỗi nhận diện âm thanh.';
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          vietnameseMsg = 'Microphone chưa được cấp quyền! Vui lòng bấm vào biểu tượng ổ khóa/mic trên thanh trình duyệt để Bật Micro.';
        } else if (event.error === 'no-speech') {
          vietnameseMsg = 'Không nghe thấy tiếng nói. Hãy thử bấm lại và nói to hơn nhé!';
        } else if (event.error === 'network') {
          vietnameseMsg = 'Mạng bị gián đoạn khi nhận diện giọng nói.';
        }

        setErrorMessage(vietnameseMsg);
        onError?.(vietnameseMsg);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        clearSilenceTimer();
        if (!isManuallyStoppedRef.current && finalTranscriptRef.current.trim()) {
          onResult?.(finalTranscriptRef.current.trim(), currentLangRef.current);
          finalTranscriptRef.current = '';
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      const msg = 'Không thể mở micro: ' + (err?.message || 'Vui lòng kiểm tra quyền truy cập');
      setErrorMessage(msg);
      onError?.(msg);
      setIsListening(false);
    }
  }, [silenceTimeoutMs, onResult, onError, stopListening]);

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

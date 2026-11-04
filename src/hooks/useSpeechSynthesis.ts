import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSpeechSynthesisOptions {
  defaultRate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export function useSpeechSynthesis({
  defaultRate = 0.9,
  onStart,
  onEnd,
  onError,
}: UseSpeechSynthesisOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentText, setCurrentText] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Nạp danh sách các giọng có sẵn trên thiết bị
  const updateVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const allVoices = window.speechSynthesis.getVoices();
    // Lọc giọng tiếng Trung (zh, cmn, zh-CN, zh-TW, ...)
    const chineseVoices = allVoices.filter(v =>
      v.lang.toLowerCase().includes('zh') ||
      v.lang.toLowerCase().includes('cmn') ||
      v.name.includes('Chinese') ||
      v.name.includes('Mandarin')
    );

    setVoices(chineseVoices.length > 0 ? chineseVoices : allVoices);

    // Ưu tiên giọng zh-CN chuẩn tự nhiên (Google, Apple, Microsoft)
    const preferred =
      chineseVoices.find(v => v.lang === 'zh-CN' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Tingting') || v.name.includes('Xiaoxiao'))) ||
      chineseVoices.find(v => v.lang.replace('_', '-').startsWith('zh-CN')) ||
      chineseVoices.find(v => v.lang.startsWith('zh')) ||
      chineseVoices[0] ||
      null;

    setSelectedVoice(preferred);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [updateVoices]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentText(null);
    }
  }, []);

  const speak = useCallback(
    (text: string, rateMultiplier: number = 1.0) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('Trình duyệt không hỗ trợ SpeechSynthesis');
        return;
      }

      // Dừng giọng đọc trước nếu đang chạy
      window.speechSynthesis.cancel();

      if (!text || text.trim() === '') return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = defaultRate * rateMultiplier; // Ví dụ: 0.9 * 0.8 = 0.72 cho chế độ đọc chậm
      utterance.pitch = 1.0;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        setCurrentText(text);
        onStart?.();
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentText(null);
        onEnd?.();
      };

      utterance.onerror = (e) => {
        // Lỗi 'interrupted' hoặc 'canceled' thường do gọi cancel() chủ động
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('SpeechSynthesis error:', e);
          onError?.(e);
        }
        setIsPlaying(false);
        setCurrentText(null);
      };

      // Giữ tham chiếu để tránh bị Garbage Collector thu hồi sớm trên Chrome
      utteranceRef.current = utterance;

      window.speechSynthesis.speak(utterance);
    },
    [defaultRate, selectedVoice, onStart, onEnd, onError]
  );

  return {
    speak,
    stop,
    isPlaying,
    currentText,
    voices,
    selectedVoice,
    setSelectedVoice,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  };
}


/**
 * Module phát âm tiếng Trung chuẩn xác trên mọi thiết bị (iOS, Android, Windows, Mac)
 * Sử dụng cơ chế kết hợp:
 * 1. Google TTS MP3 trực tiếp (âm thanh tự nhiên, giọng chuẩn bản xứ, hoạt động 100% ngay cả khi máy không cài ngôn ngữ Trung).
 * 2. Dự phòng: Web SpeechSynthesis của trình duyệt khi offline hoặc có lỗi.
 */

let currentAudio: HTMLAudioElement | null = null;

export function playZhAudio(text: string, rate: number = 1.0): Promise<void> {
  return new Promise((resolve) => {
    if (!text || !text.trim()) {
      resolve();
      return;
    }

    const cleanText = text.trim();

    // Dừng âm thanh đang phát trước đó
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (e) {}
      currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    // Cách 1: Thử phát bằng Google TTS MP3 (giọng bản xứ chuẩn, luôn phát được)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
    const audio = new Audio(ttsUrl);
    currentAudio = audio;
    audio.playbackRate = rate;

    let hasEnded = false;

    audio.onended = () => {
      hasEnded = true;
      currentAudio = null;
      resolve();
    };

    audio.onerror = () => {
      if (hasEnded) return;
      hasEnded = true;
      currentAudio = null;
      // Cách 2 dự phòng: Dùng speechSynthesis của trình duyệt
      fallbackSpeechSynthesis(cleanText, rate, resolve);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        if (hasEnded) return;
        hasEnded = true;
        currentAudio = null;
        fallbackSpeechSynthesis(cleanText, rate, resolve);
      });
    }
  });
}

function fallbackSpeechSynthesis(text: string, rate: number, onDone: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onDone();
    return;
  }

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;

    // Tìm giọng tiếng Trung nếu có
    const allVoices = window.speechSynthesis.getVoices();
    const zhVoice = allVoices.find(
      (v) => v.lang.includes('zh') || v.lang.includes('cmn') || v.name.includes('Chinese')
    );
    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    utterance.onend = () => onDone();
    utterance.onerror = () => onDone();

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    onDone();
  }
}

export function stopZhAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

/**
 * Module phát âm tiếng Trung chuẩn xác trên mọi thiết bị (iOS, Android, Windows, Mac)
 * Cơ chế hoạt động:
 * 1. Gọi proxy cùng domain: /api/tts?text=... (phát âm bản xứ chuẩn Bắc Kinh, không bị chặn CORS hay Referer).
 * 2. Hỗ trợ unlock quyền phát audio tự động trên Safari / iOS ngay từ cú chạm đầu tiên.
 * 3. Tự động điều chỉnh tốc độ đọc (0.7x chậm / 1.0x chuẩn / 1.25x nhanh).
 * 4. Dự phòng: Web SpeechSynthesis của trình duyệt khi offline.
 */

let currentAudio: HTMLAudioElement | null = null;
let currentSpeakingText: string | null = null;
let isAudioUnlocked = false;

// Bộ nhớ đệm audio URL để phát tức thì khi bấm nghe lại
const audioUrlCache = new Map<string, string>();

type AudioStateListener = (isPlaying: boolean, text: string | null) => void;
const listeners = new Set<AudioStateListener>();

function notifyState(isPlaying: boolean, text: string | null) {
  currentSpeakingText = isPlaying ? text : null;
  listeners.forEach((listener) => {
    try {
      listener(isPlaying, text);
    } catch (e) { }
  });
}

export function subscribeAudioState(listener: AudioStateListener): () => void {
  listeners.add(listener);
  listener(currentAudio !== null, currentSpeakingText);
  return () => {
    listeners.delete(listener);
  };
}

export function isAudioPlaying(): boolean {
  return currentAudio !== null;
}

/**
 * Unlock Audio trên iOS Safari:
 * iOS Safari yêu cầu user gesture (click/touch) để mở khóa phát âm thanh.
 * Chạy hàm này khi người dùng chạm vào màn hình lần đầu tiên.
 */
export function unlockAudio() {
  if (isAudioUnlocked || typeof window === 'undefined') return;

  try {
    const silent = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    silent.volume = 0.01;
    silent
      .play()
      .then(() => {
        silent.pause();
        isAudioUnlocked = true;
      })
      .catch(() => { });
  } catch (e) { }
}

if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  window.addEventListener('click', unlockAudio, { once: true, passive: true });
}

/**
 * Phát âm thanh tiếng Trung
 * @param text Câu chữ Hán cần đọc
 * @param rate Tốc độ đọc (1.0 = bình thường, 0.7 = đọc chậm)
 */
export function playZhAudio(text: string, rate: number = 1.0): Promise<void> {
  return new Promise((resolve) => {
    if (!text || !text.trim()) {
      resolve();
      return;
    }

    const cleanText = text.trim();

    // Dừng âm thanh đang phát trước đó
    stopZhAudio();

    notifyState(true, cleanText);

    // Cách 1: Sử dụng /api/tts cùng origin (chạy mượt 100% trên cả iPhone/Android/PC)
    const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}`;
    const audio = new Audio(ttsUrl);
    currentAudio = audio;
    audio.playbackRate = rate;

    let hasEnded = false;

    const cleanupAndResolve = () => {
      if (hasEnded) return;
      hasEnded = true;
      if (currentAudio === audio) {
        currentAudio = null;
      }
      notifyState(false, null);
      resolve();
    };

    audio.onended = () => {
      cleanupAndResolve();
    };

    audio.onerror = (e) => {
      console.warn('Lỗi phát /api/tts, chuyển sang Web SpeechSynthesis:', e);
      if (hasEnded) return;
      currentAudio = null;
      // Cách 2 dự phòng: Dùng speechSynthesis của trình duyệt
      fallbackSpeechSynthesis(cleanText, rate, cleanupAndResolve);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio play() bị chặn, thử fallback SpeechSynthesis:', err);
        if (hasEnded) return;
        currentAudio = null;
        fallbackSpeechSynthesis(cleanText, rate, cleanupAndResolve);
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
    } catch (e) { }
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) { }
  }
  notifyState(false, null);
}

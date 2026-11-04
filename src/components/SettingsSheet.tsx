import React from 'react';
import { X, RotateCcw, Volume2, Type, Globe, Check } from 'lucide-react';
import { UserSettings, CorrectionMode } from '../types';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onResetChat: () => void;
  availableVoices: SpeechSynthesisVoice[];
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetChat,
  availableVoices,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            ⚙️ Cài đặt buổi học
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-4 text-sm">
          {/* 1. Tốc độ giọng đọc AI */}
          <div>
            <label className="font-semibold text-stone-800 flex items-center gap-1.5 mb-2">
              <Volume2 className="w-4 h-4 text-amber-600" />
              <span>Tốc độ đọc của Lão Sư Mei</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ speechRate: 0.75 })}
                className={`py-2 px-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  settings.speechRate === 0.75
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span>🐢 Chậm (0.75x)</span>
                {settings.speechRate === 0.75 && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ speechRate: 1.0 })}
                className={`py-2 px-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  settings.speechRate === 1.0
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span>🔊 Bình thường (1.0x)</span>
                {settings.speechRate === 1.0 && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 2. Tự động đọc câu trả lời */}
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="font-semibold text-stone-800">Tự động đọc to</div>
              <div className="text-xs text-stone-500">AI vừa trả lời là tự đọc ngay bằng giọng tiếng Trung</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPlaySpeech}
              onChange={(e) => onUpdateSettings({ autoPlaySpeech: e.target.checked })}
              className="w-5 h-5 accent-red-600 rounded cursor-pointer"
            />
          </div>

          {/* 3. Hiển thị Pinyin */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-amber-600" />
              <div>
                <div className="font-semibold text-stone-800">Hiện phiên âm Pinyin</div>
                <div className="text-xs text-stone-500">Tắt đi nếu bạn muốn tự kiểm tra trí nhớ chữ Hán</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.showPinyin}
              onChange={(e) => onUpdateSettings({ showPinyin: e.target.checked })}
              className="w-5 h-5 accent-red-600 rounded cursor-pointer"
            />
          </div>

          {/* 4. Hiển thị Nghĩa tiếng Việt */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-600" />
              <div>
                <div className="font-semibold text-stone-800">Hiện nghĩa tiếng Việt</div>
                <div className="text-xs text-stone-500">Bản dịch tiếng Việt dưới từng câu nói của AI</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.showVietnamese}
              onChange={(e) => onUpdateSettings({ showVietnamese: e.target.checked })}
              className="w-5 h-5 accent-red-600 rounded cursor-pointer"
            />
          </div>

          {/* 5. Chế độ sửa lỗi */}
          <div>
            <label className="font-semibold text-stone-800 block mb-1.5">
              Mức độ sửa lỗi của gia sư
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ correctionMode: 'gentle' })}
                className={`py-2 px-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                  settings.correctionMode === 'gentle'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div>🌱 Nhẹ nhàng</div>
                <div className="text-[10px] text-stone-500 font-normal">Khích lệ là chính, sửa 1 lỗi/lần</div>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ correctionMode: 'immediate' })}
                className={`py-2 px-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                  settings.correctionMode === 'immediate'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div>🎯 Sửa ngay</div>
                <div className="text-[10px] text-stone-500 font-normal">Sửa chi tiết từng câu</div>
              </button>
            </div>
          </div>

          {/* 6. Chọn giọng đọc thiết bị */}
          {availableVoices.length > 0 && (
            <div>
              <label className="font-semibold text-stone-800 block mb-1">
                Giọng đọc tiếng Trung trên máy
              </label>
              <select
                value={settings.selectedVoiceURI || ''}
                onChange={(e) => onUpdateSettings({ selectedVoiceURI: e.target.value || null })}
                className="w-full p-2.5 rounded-2xl border border-stone-200 bg-stone-50 text-xs text-stone-800 focus:outline-none focus:border-red-500"
              >
                <option value="">Tự động chọn giọng chuẩn nhất</option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 7. Nút Bắt đầu lại */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn bắt đầu lại cuộc hội thoại từ đầu không?')) {
                  onResetChat();
                  onClose();
                }
              }}
              className="w-full py-2.5 px-4 rounded-2xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Bắt đầu lại hội thoại này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


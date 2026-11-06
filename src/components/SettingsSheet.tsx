import React from 'react';
import { X, Volume2, Type, Globe, Check, Award, ShieldAlert, Sparkles } from 'lucide-react';
import { UserSettings, StrictnessLevel } from '../types';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  availableVoices: SpeechSynthesisVoice[];
  onResetChat?: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  availableVoices,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            ⚙️ Cài đặt học tập
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-3 text-sm">
          {/* 1. Tốc độ giọng đọc AI */}
          <div>
            <label className="font-semibold text-stone-800 flex items-center gap-1.5 mb-2 text-xs">
              <Volume2 className="w-4 h-4 text-amber-600" />
              <span>Tốc độ đọc của Lão Sư Mei</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 0.8, label: '🐢 Chậm (0.8x)' },
                { val: 1.0, label: '🔊 Vừa (1.0x)' },
                { val: 1.2, label: '⚡ Nhanh (1.2x)' },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => onUpdateSettings({ speechRate: item.val })}
                  className={`py-2 px-2 rounded-2xl border text-xs font-semibold text-center transition-all ${
                    settings.speechRate === item.val
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-2xs font-bold'
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Độ nghiêm của gia sư AI */}
          <div>
            <label className="font-semibold text-stone-800 flex items-center gap-1.5 mb-2 text-xs">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Độ nghiêm của Gia Sư</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ strictness: 'strict' })}
                className={`py-2.5 px-3 rounded-2xl border text-left transition-all ${
                  settings.strictness === 'strict'
                    ? 'border-red-500 bg-red-50 text-red-800 font-bold shadow-2xs'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="text-xs">🎯 Nghiêm (Mặc định)</div>
                <div className="text-[10px] text-stone-500 font-normal mt-0.5">
                  Bắt buộc sửa đúng ≥ 80% mới được tiếp tục
                </div>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ strictness: 'relaxed' })}
                className={`py-2.5 px-3 rounded-2xl border text-left transition-all ${
                  settings.strictness === 'relaxed'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold shadow-2xs'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="text-xs">🌱 Thoải mái</div>
                <div className="text-[10px] text-stone-500 font-normal mt-0.5">
                  Chỉ sửa lỗi nặng, lỗi nhỏ nhắc nhẹ
                </div>
              </button>
            </div>
          </div>

          {/* 3. Ngưỡng điểm qua bài */}
          <div>
            <label className="font-semibold text-stone-800 flex items-center gap-1.5 mb-2 text-xs">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Ngưỡng điểm để qua bài (Shadowing & Sửa lỗi)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[70, 80, 90, 100].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onUpdateSettings({ passThreshold: t })}
                  className={`py-2 px-1 rounded-2xl border text-xs font-bold transition-all ${
                    settings.passThreshold === t
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-2xs'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {t}% {t === 80 && '★'}
                </button>
              ))}
            </div>
          </div>


          {/* 5. Tự động đọc to */}
          <div className="flex items-center justify-between py-1 border-t border-stone-100 pt-3">
            <div>
              <div className="font-semibold text-stone-800 text-xs">Tự động đọc to khi AI trả lời</div>
              <div className="text-[11px] text-stone-500">Phát âm ngay câu tiếng Trung</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPlay}
              onChange={(e) => onUpdateSettings({ autoPlay: e.target.checked })}
              className="w-5 h-5 accent-red-600 rounded cursor-pointer"
            />
          </div>

          {/* 6. Hiển thị Pinyin */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-amber-600" />
              <div>
                <div className="font-semibold text-stone-800 text-xs">Hiện phiên âm Pinyin</div>
                <div className="text-[11px] text-stone-500">Tắt đi nếu muốn tự nhận mặt chữ Hán</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.showPinyin}
              onChange={(e) => onUpdateSettings({ showPinyin: e.target.checked })}
              className="w-5 h-5 accent-red-600 rounded cursor-pointer"
            />
          </div>

          {/* 7. Hiển thị Nghĩa tiếng Việt */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-600" />
              <div>
                <div className="font-semibold text-stone-800 text-xs">Hiện nghĩa tiếng Việt</div>
                <div className="text-[11px] text-stone-500">Dịch nghĩa câu bên dưới</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.showVi}
              onChange={(e) => onUpdateSettings({ showVi: e.target.checked })}
              className="w-5 h-5 accent-red-600 rounded cursor-pointer"
            />
          </div>

          {/* 8. Chọn giọng đọc thiết bị */}
          {availableVoices.length > 0 && (
            <div className="border-t border-stone-100 pt-3">
              <label className="font-semibold text-stone-800 block mb-1 text-xs">
                Giọng đọc tiếng Trung trên thiết bị
              </label>
              <select
                value={settings.selectedVoiceURI || ''}
                onChange={(e) => onUpdateSettings({ selectedVoiceURI: e.target.value || null })}
                className="w-full p-2.5 rounded-2xl border border-stone-200 bg-stone-50 text-xs text-stone-800 focus:outline-hidden focus:border-red-500"
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
        </div>
      </div>
    </div>
  );
};

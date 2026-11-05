import React from 'react';
import { HSKLevel, Scenario } from '../types';
import { SCENARIOS } from '../lib/scenarios';
import { ScenarioCard } from '../components/ScenarioCard';
import { Sparkles, MessageCircle, Mic, Check } from 'lucide-react';

interface HomeScreenProps {
  level: HSKLevel;
  onSelectLevel: (level: HSKLevel) => void;
  onSelectScenario: (scenario: Scenario) => void;
}

const HSK_LEVELS: { id: HSKLevel; label: string; desc: string; wordCount: string }[] = [
  { id: 'HSK1', label: 'Mới bắt đầu (HSK 1)', desc: 'Câu ngắn, từ vựng rất đơn giản', wordCount: '~150 từ' },
  { id: 'HSK2', label: 'Cơ bản (HSK 2)', desc: 'Hội thoại đời thường thông dụng', wordCount: '~300 từ' },
  { id: 'HSK3', label: 'Trung cấp (HSK 3)', desc: 'Nói tự nhiên, mở rộng chủ đề', wordCount: '~600 từ' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  level,
  onSelectLevel,
  onSelectScenario,
}) => {
  const [isIOSStandalone, setIsIOSStandalone] = React.useState(false);

  React.useEffect(() => {
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

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-red-600 to-red-700 text-white pt-8 pb-10 px-4 rounded-b-[2.5rem] shadow-md">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-800/60 backdrop-blur-xs text-amber-200 text-xs font-semibold mb-3 border border-red-500/50">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gia sư AI luyện nói 1-1</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            🇨🇳 Lão Sư Mei (美老师)
          </h1>
          <p className="text-sm text-red-100 max-w-xs mx-auto leading-relaxed">
            Học nói tiếng Trung giao tiếp mỗi ngày. Bấm nút mic to và nói cùng Mei!
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4">
        {/* Cảnh báo riêng cho người dùng iPhone mở từ màn hình chính */}
        {isIOSStandalone && (
          <div className="bg-amber-100 border border-amber-300 rounded-3xl p-4 mb-4 text-xs text-amber-950 shadow-sm flex flex-col gap-2 animate-fade-in">
            <div className="font-bold flex items-center gap-1.5 text-amber-950 text-sm">
              <span>📱 Lưu ý quan trọng cho iPhone:</span>
            </div>
            <p className="leading-relaxed">
              Bạn đang mở từ <b>Màn hình chính</b>. Apple chặn micro của tất cả trang web khi mở ở chế độ này.
            </p>
            <p className="leading-relaxed text-[11px] text-amber-800">
              👉 Hãy mở link trực tiếp trên tab <b>Safari</b> để nói chuyện với Lão Sư Mei nhé!
            </p>
            <div className="flex gap-2 pt-1">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-center flex-1 shadow-xs active:scale-95 text-xs transition-colors"
              >
                Mở trong Safari
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Đã chép link! Bạn hãy mở trình duyệt Safari và dán link vào nhé.');
                }}
                className="px-3 py-2 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 rounded-xl font-bold text-center flex-1 shadow-xs active:scale-95 text-xs transition-colors"
              >
                Sao chép link
              </button>
            </div>
          </div>
        )}

        {/* Chọn trình độ HSK */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-200/90 mb-5">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2.5">
            1. Chọn trình độ của bạn:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {HSK_LEVELS.map((item) => {
              const isSelected = level === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectLevel(item.id)}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-xs scale-102'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs font-bold">{item.id}</div>
                  <div className="text-[10px] text-stone-500 truncate mt-0.5">
                    {item.wordCount}
                  </div>
                  {isSelected && (
                    <div className="mt-1 flex justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lưới các tình huống */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              2. Chọn tình huống muốn luyện:
            </h2>
            <span className="text-xs text-stone-500">8 chủ đề</span>
          </div>

          <div className="space-y-3">
            {SCENARIOS.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onClick={() => onSelectScenario(scenario)}
              />
            ))}
          </div>
        </div>

        {/* Hướng dẫn ngắn */}
        <div className="p-4 rounded-3xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 leading-relaxed space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-amber-950">
            <Mic className="w-4 h-4 text-amber-700" />
            <span>Mẹo học nhanh cùng Lão Sư Mei:</span>
          </div>
          <p>• Bấm nút mic to ở giữa và nói to, rõ ràng.</p>
          <p>• Nếu chưa biết câu tiếng Trung nói thế nào, hãy nói bằng <strong>tiếng Việt</strong> — Mei sẽ dịch và hướng dẫn bạn nói lại.</p>
          <p>• Đừng ngại phát âm sai, Mei sẽ sửa nhẹ nhàng và luôn khích lệ bạn!</p>
        </div>
      </div>
    </div>
  );
};


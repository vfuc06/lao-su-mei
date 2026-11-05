import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, KeyRound, Loader2, X, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMessage,
}) => {
  const { signInWithOtp, verifyOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập đúng địa chỉ email!');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await signInWithOtp(email.trim());
    setIsLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại email!');
    } else {
      setStep('otp');
      setSuccessMsg(`Mã xác thực 6 số đã được gửi đến ${email}. Hãy kiểm tra hòm thư của bạn!`);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken.trim() || otpToken.trim().length < 6) {
      setErrorMsg('Vui lòng nhập đủ mã 6 số OTP!');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const { error } = await verifyOtp(email.trim(), otpToken.trim());
    setIsLoading(false);

    if (error) {
      setErrorMsg('Mã OTP không đúng hoặc đã hết hạn. Hãy thử lại!');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
            {step === 'email' ? <Mail className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <h3 className="text-lg font-bold text-stone-900">
            {step === 'email' ? 'Đăng nhập học tập' : 'Nhập mã xác thực'}
          </h3>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            {initialMessage || 'Đăng nhập để lưu tiến trình, streak và đồng bộ bài học trên mọi thiết bị.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 leading-snug">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 leading-snug">
            {successMsg}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1.5">
                Địa chỉ Email của bạn:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vidu@gmail.com"
                required
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 focus:outline-hidden focus:border-red-500 text-sm bg-stone-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Nhận mã 6 số qua Email</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1.5">
                Mã OTP (6 chữ số):
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 focus:outline-hidden focus:border-red-500 text-xl font-bold tracking-widest text-center bg-stone-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpToken.length < 6}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Xác nhận & Đăng nhập</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full text-xs text-stone-500 hover:text-stone-800 text-center py-1"
            >
              Dùng email khác?
            </button>
          </form>
        )}

        {/* Cam kết quyền riêng tư (Ràng buộc 7) */}
        <div className="mt-5 pt-4 border-t border-stone-100 flex items-start gap-2 text-[11px] text-stone-500 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>
            <b>Cam kết bảo mật:</b> Chúng tôi <u>không lưu âm thanh</u> giọng nói của bạn. Hệ thống chỉ lưu chữ nhận diện và điểm số học tập.
          </span>
        </div>
      </div>
    </div>
  );
};

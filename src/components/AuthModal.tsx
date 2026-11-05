import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, KeyRound, Lock, Loader2, X, ShieldCheck, Zap, UserPlus, LogIn } from 'lucide-react';

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
  const { signInWithOtp, verifyOtp, signInWithPassword, signUpWithPassword } = useAuth();

  // Chế độ: 'otp' (mã 6 số qua email) | 'password' (mật khẩu)
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp');
  const [passwordMode, setPasswordMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Đăng nhập 1-chạm bằng tài khoản trải nghiệm (Không tốn email, không bao giờ rate limit)
  const handleQuickDemoLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await signInWithPassword('demo@laosumei.com', 'MeiLaoShi123!');
    setIsLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Không thể đăng nhập tài khoản trải nghiệm!');
    } else {
      onClose();
    }
  };

  // 2. Gửi mã OTP qua email
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
      const msg = error.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
        setErrorMsg('⚠️ Supabase giới hạn tối đa email/giờ (Rate limit). Bạn hãy bấm nút "Vào ngay" màu vàng ở trên hoặc chuyển sang tab "Mật khẩu" để vào học ngay nhé!');
      } else {
        setErrorMsg(error.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại email!');
      }
    } else {
      setStep('otp');
      setSuccessMsg(`Mã xác thực 6 số đã được gửi đến ${email}. Hãy kiểm tra hòm thư của bạn!`);
    }
  };

  // 3. Xác thực mã OTP 6 số
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

  // 4. Đăng nhập / Đăng ký bằng Mật khẩu (Không gửi email, không sợ rate limit)
  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập đúng địa chỉ email!');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setErrorMsg('Mật khẩu cần tối thiểu 6 ký tự!');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (passwordMode === 'login') {
      const { error } = await signInWithPassword(email.trim(), password.trim());
      setIsLoading(false);
      if (error) {
        setErrorMsg(error.message.includes('Invalid login') ? 'Email hoặc mật khẩu chưa đúng!' : error.message);
      } else {
        onClose();
      }
    } else {
      const { error } = await signUpWithPassword(email.trim(), password.trim());
      setIsLoading(false);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Đăng ký tài khoản thành công!');
        setTimeout(() => onClose(), 1000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
            {authMode === 'otp' ? (
              step === 'email' ? <Mail className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-lg font-black text-stone-900">
            {step === 'otp' ? 'Nhập mã xác thực' : 'Đăng nhập học tập'}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
            {initialMessage || 'Lưu tiến trình, streak và đồng bộ bài học trên mọi thiết bị.'}
          </p>
        </div>

        {/* THẺ 1-CHẠM VÀO TRẢI NGHIỆM NGAY (KHÔNG CẦN CHỜ EMAIL) */}
        <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-black text-amber-950 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>Đăng nhập 1-chạm</span>
              </div>
              <div className="text-[11px] text-amber-800/80 leading-tight mt-0.5">
                Vào học ngay lập tức, không lo giới hạn email!
              </div>
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleQuickDemoLogin}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-xs flex-shrink-0"
            >
              Vào ngay
            </button>
          </div>
        </div>

        {/* CÔNG TẮC CHUYỂN GIỮA: MÃ OTP EMAIL & MẬT KHẨU */}
        {step === 'email' && (
          <div className="p-1 bg-stone-100 rounded-2xl flex items-center mb-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('otp');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                authMode === 'otp'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              ✉️ Mã OTP Email
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                authMode === 'password'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              🔑 Mật khẩu
            </button>
          </div>
        )}

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

        {/* 1. CHẾ ĐỘ OTP QUA EMAIL */}
        {authMode === 'otp' ? (
          step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Địa chỉ Email của bạn:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vidu@gmail.com"
                  required
                  className="w-full px-4 py-2.5 rounded-2xl border border-stone-300 focus:outline-hidden focus:border-red-500 text-sm bg-stone-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Nhận mã 6 số qua Email</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
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
                  className="w-full px-4 py-2.5 rounded-2xl border border-stone-300 focus:outline-hidden focus:border-red-500 text-xl font-bold tracking-widest text-center bg-stone-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otpToken.length < 6}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
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
          )
        ) : (
          /* 2. CHẾ ĐỘ MẬT KHẨU (KHÔNG TỐN QUOTA EMAIL) */
          <form onSubmit={handlePasswordAuth} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Địa chỉ Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vidu@gmail.com"
                required
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-300 focus:outline-hidden focus:border-red-500 text-sm bg-stone-50/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Mật khẩu (≥ 6 ký tự):
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-300 focus:outline-hidden focus:border-red-500 text-sm bg-stone-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{passwordMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setPasswordMode((prev) => (prev === 'login' ? 'signup' : 'login'));
                  setErrorMsg(null);
                }}
                className="text-xs text-stone-500 hover:text-red-700 underline"
              >
                {passwordMode === 'login' ? 'Chưa có tài khoản? Tạo tài khoản mới' : 'Đã có tài khoản? Đăng nhập'}
              </button>
            </div>
          </form>
        )}

        {/* Cam kết quyền riêng tư (Ràng buộc 7) */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-start gap-2 text-[11px] text-stone-500 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>
            <b>Bảo mật tuyệt đối:</b> Hệ thống <u>không lưu âm thanh</u> của bạn, chỉ lưu văn bản nhận diện và điểm số.
          </span>
        </div>
      </div>
    </div>
  );
};

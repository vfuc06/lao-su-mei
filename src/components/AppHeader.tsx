import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Flame, Settings, User as UserIcon, BookMarked, LogOut, LogIn } from 'lucide-react';

interface AppHeaderProps {
  onOpenSettings: () => void;
  onOpenMistakes: () => void;
  onOpenAuth: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenSettings,
  onOpenMistakes,
  onOpenAuth,
}) => {
  const { user, profile, streak, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-2.5">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Logo & Tên ứng dụng */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            美
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-stone-900 leading-none">
              Lão Sư Mei
            </h1>
            <p className="text-[10px] text-stone-500 font-medium">Gia sư nói tiếng Trung 1-1</p>
          </div>
        </div>

        {/* Thanh công cụ phải: Streak, Sổ lỗi, Cài đặt & Avatar */}
        <div className="flex items-center gap-2">
          {/* 🔥 Chuỗi ngày liên tiếp (Streak) */}
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold shadow-2xs">
            <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500 animate-pulse" />
            <span>{streak} ngày</span>
          </div>

          {/* Sổ lỗi (Quick access) */}
          <button
            type="button"
            onClick={onOpenMistakes}
            title="Sổ lỗi cần ôn lại"
            className="p-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <BookMarked className="w-4 h-4" />
          </button>

          {/* Nút Cài đặt */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Cài đặt"
            className="p-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Tài khoản / Đăng nhập */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center border border-red-200 shadow-2xs hover:scale-105 transition-transform"
              >
                {profile?.displayName?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 z-50 text-xs space-y-1 animate-fade-in">
                    <div className="px-3 py-2 border-b border-stone-100">
                      <div className="font-bold text-stone-900 truncate">
                        {profile?.displayName || 'Học viên'}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate">{user.email}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenMistakes();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-stone-100 text-stone-700 flex items-center gap-2"
                    >
                      <BookMarked className="w-4 h-4 text-amber-600" />
                      <span>Sổ câu cần sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-stone-100 text-stone-700 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4 text-stone-600" />
                      <span>Cài đặt chung</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        signOut();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


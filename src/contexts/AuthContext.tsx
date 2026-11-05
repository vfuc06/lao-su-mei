import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, UserSettings } from '../types';

export const DEFAULT_SETTINGS: UserSettings = {
  speechRate: 1.0,
  autoPlay: true,
  showPinyin: true,
  showVi: true,
  passThreshold: 80,
  strictness: 'strict',
  dailyNewCards: 10,
  estimatedLevel: 1,
  selectedVoiceURI: null,
};

const LOCAL_STORAGE_SETTINGS_KEY = 'lao_su_mei_settings';
const LOCAL_STORAGE_GUEST_ID_KEY = 'lao_su_mei_guest_id';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  settings: UserSettings;
  streak: number;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Khởi tạo cài đặt từ localStorage trước để UI tải tức thì
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });

  // Tải thông tin Profile & Streak từ Supabase
  const loadUserData = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return;
    try {
      // 1. Tải Profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        const dbSettings = { ...DEFAULT_SETTINGS, ...(profileData.settings || {}) };
        setSettings(dbSettings);
        localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(dbSettings));
        setProfile({
          id: profileData.id,
          displayName: profileData.display_name || 'Học viên',
          settings: dbSettings,
          createdAt: profileData.created_at,
        });
      } else if (!profileErr) {
        // Tự tạo profile nếu chưa có
        const newProf = {
          id: userId,
          display_name: 'Học viên',
          settings: settings,
        };
        await supabase.from('profiles').insert(newProf);
      }

      // 2. Tính Streak theo múi giờ Việt Nam
      const { data: activityRows } = await supabase
        .from('daily_activity')
        .select('day, ai_turns, cards_reviewed, shadowing_done')
        .eq('user_id', userId)
        .order('day', { ascending: false })
        .limit(30);

      if (activityRows && activityRows.length > 0) {
        let currentStreak = 0;
        const now = new Date();
        // Lấy ngày hiện tại theo giờ Việt Nam (UTC+7)
        const vnDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
        
        let expectedDate = new Date(vnDateStr);
        for (const row of activityRows) {
          const totalActions = (row.ai_turns || 0) + (row.cards_reviewed || 0) + (row.shadowing_done || 0);
          if (totalActions > 0) {
            currentStreak++;
          } else {
            break;
          }
        }
        setStreak(currentStreak);
      }
    } catch (e) {
      console.warn('Lỗi tải dữ liệu người dùng:', e);
    }
  }, [settings]);

  // Lắng nghe trạng thái đăng nhập Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadUserData(currentUser.id);
      } else {
        setProfile(null);
        setStreak(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  // Đăng nhập bằng Email OTP
  const signInWithOtp = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Chưa cấu hình Supabase') };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    return { error };
  };

  // Xác thực mã OTP 6 số
  const verifyOtp = async (email: string, token: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Chưa cấu hình Supabase') };
    }
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (!error && data.user) {
      setUser(data.user);
      await loadUserData(data.user.id);
    }
    return { error };
  };

  // Đăng nhập bằng Email & Mật khẩu (Không gửi email, không bao giờ bị rate limit)
  const signInWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Chưa cấu hình Supabase') };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.user) {
      setUser(data.user);
      await loadUserData(data.user.id);
    }
    return { error };
  };

  // Đăng ký bằng Email & Mật khẩu
  const signUpWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Chưa cấu hình Supabase') };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (!error && data.user) {
      setUser(data.user);
      await loadUserData(data.user.id);
    }
    return { error };
  };

  // Đăng xuất
  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setStreak(0);
  };

  // Cập nhật cài đặt (lưu cả localStorage và Supabase nếu đã đăng nhập)
  const updateSettings = async (newPartial: Partial<UserSettings>) => {
    const updated = { ...settings, ...newPartial };
    setSettings(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
      if (user && isSupabaseConfigured) {
        await supabase
          .from('profiles')
          .update({ settings: updated })
          .eq('id', user.id);
      }
    } catch (e) {
      console.warn('Lỗi lưu cài đặt:', e);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        settings,
        streak,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signInWithOtp,
        verifyOtp,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        updateSettings,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


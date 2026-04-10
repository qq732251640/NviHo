import Taro from '@tarojs/taro';
import { create } from 'zustand';
import { authApi } from '../api';

interface User {
  id: number;
  username: string;
  real_name: string;
  role: string;
  school_id: number;
  grade_name?: string;
  student_no?: string;
  school_name?: string;
  grade_level?: string;
  credits?: number;
  free_report_used?: number;
  free_paper_used?: number;
  free_class_report_used?: number;
  free_student_report_used?: number;
  region_id?: number;
  region_path?: number[];
  is_profile_complete?: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  login: (username: string, password: string) => Promise<void>;
  wxLogin: () => Promise<{ needsProfile: boolean }>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  isProfileComplete: () => boolean;
}

export function checkProfileComplete(user: User | null): boolean {
  if (!user) return false;
  if (user.is_profile_complete !== undefined) return user.is_profile_complete;
  return !!(user.school_name && user.school_id && user.role && user.grade_level);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  login: async (username, password) => {
    const res = await authApi.login(username, password);
    Taro.setStorageSync('access_token', res.access_token);
    const me = await authApi.getMe();
    set({ user: me });
  },

  wxLogin: async () => {
    const { code } = await Taro.login();
    const res = await authApi.wxLogin(code);
    Taro.setStorageSync('access_token', res.access_token);
    const me = await authApi.getMe();
    set({ user: me });
    return { needsProfile: !checkProfileComplete(me) };
  },

  logout: () => {
    Taro.removeStorageSync('access_token');
    set({ user: null });
    Taro.redirectTo({ url: '/pages/login/index' });
  },

  fetchUser: async () => {
    const token = Taro.getStorageSync('access_token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const me = await authApi.getMe();
      set({ user: me, loading: false });
    } catch {
      Taro.removeStorageSync('access_token');
      set({ user: null, loading: false });
    }
  },

  isProfileComplete: () => checkProfileComplete(get().user),
}));

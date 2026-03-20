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
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  login: async (username, password) => {
    const res = await authApi.login(username, password);
    Taro.setStorageSync('access_token', res.access_token);
    const me = await authApi.getMe();
    set({ user: me });
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
}));

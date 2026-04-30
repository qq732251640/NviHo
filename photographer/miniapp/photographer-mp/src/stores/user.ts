import { create } from 'zustand';
import Taro from '@tarojs/taro';

import { UserInfo } from '@/types';
import { getMe } from '@/api/auth';

interface UserState {
  user: UserInfo | null;
  loaded: boolean;
  setUser: (u: UserInfo | null) => void;
  loadFromCache: () => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loaded: false,

  setUser: (u) => {
    set({ user: u, loaded: true });
    if (u) {
      Taro.setStorageSync('user_info', u);
    } else {
      Taro.removeStorageSync('user_info');
    }
  },

  loadFromCache: () => {
    const cached = Taro.getStorageSync('user_info');
    if (cached) {
      set({ user: cached as UserInfo, loaded: true });
    } else {
      set({ loaded: true });
    }
  },

  refresh: async () => {
    try {
      const u = await getMe();
      set({ user: u, loaded: true });
      Taro.setStorageSync('user_info', u);
    } catch (e) {
      set({ loaded: true });
    }
  },

  logout: () => {
    Taro.removeStorageSync('access_token');
    Taro.removeStorageSync('user_info');
    set({ user: null });
  },
}));

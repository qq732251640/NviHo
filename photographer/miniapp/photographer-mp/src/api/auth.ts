import { request } from './client';
import { UserInfo } from '@/types';

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const wxLogin = (code: string, nickname?: string, avatar?: string) =>
  request<Token>({
    url: '/auth/wx-login',
    method: 'POST',
    data: { code, nickname, avatar },
  });

export const devLogin = (username: string) =>
  request<Token>({
    url: '/auth/dev-login',
    method: 'POST',
    data: { username, password: '123456' },
  });

export const getMe = () => request<UserInfo>({ url: '/auth/me' });

export const updateMe = (data: Partial<UserInfo>) =>
  request<UserInfo>({ url: '/auth/me', method: 'PUT', data });

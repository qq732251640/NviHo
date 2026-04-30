import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Text, View } from '@tarojs/components';

import { devLogin, getMe, wxLogin } from '@/api/auth';
import { useUserStore } from '@/stores/user';
import './index.scss';

export default function LoginPage() {
  const { setUser } = useUserStore();
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const finishLogin = async () => {
    const me = await getMe();
    setUser(me);
    Taro.navigateBack();
  };

  const onWxLogin = async () => {
    setSubmitting(true);
    try {
      const res = await Taro.login();
      if (!res.code) throw new Error('未获取到 code');
      const profile = await Taro.getUserProfile({
        desc: '用于完善会员资料',
      }).catch(() => null);
      const token = await wxLogin(
        res.code,
        profile?.userInfo.nickName,
        profile?.userInfo.avatarUrl
      );
      Taro.setStorageSync('access_token', token.access_token);
      await finishLogin();
    } catch (e: any) {
      Taro.showToast({ title: e.detail || e.message || '登录失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const onDevLogin = async () => {
    if (!username.trim()) {
      Taro.showToast({ title: '请填写用户名', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      const token = await devLogin(username.trim());
      Taro.setStorageSync('access_token', token.access_token);
      await finishLogin();
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '登录失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="login-page">
      <View className="hero">
        <View className="title">约拍 · 太原</View>
        <View className="sub">挑摄影师 · 看排期 · 一键预约</View>
      </View>

      <View className="primary-btn" onClick={onWxLogin}>
        微信一键登录
      </View>

      <View className="divider">
        <Text>或</Text>
      </View>

      <View className="dev-block">
        <View className="dev-title">开发期免登录(任意填一个用户名)</View>
        <Input
          className="dev-input"
          placeholder="如:test01 / hao / 飞机"
          value={username}
          onInput={(e: any) => setUsername(e.detail.value)}
        />
        <View
          className="ghost-btn"
          onClick={submitting ? undefined : onDevLogin}
        >
          {submitting ? '登录中...' : '开发期免登录'}
        </View>
      </View>
    </View>
  );
}

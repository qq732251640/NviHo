import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input } from '@tarojs/components';
import { useAuthStore, checkProfileComplete } from '../../stores/auth';
import './index.scss';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [wxLoading, setWxLoading] = useState(false);
  const [showAccountLogin, setShowAccountLogin] = useState(false);
  const { login, wxLogin } = useAuthStore();

  const navigateAfterLogin = (user: any) => {
    if (!checkProfileComplete(user)) {
      Taro.redirectTo({ url: '/pages/complete-profile/index' });
    } else {
      Taro.switchTab({ url: '/pages/student/dashboard' });
    }
  };

  const handleWxLogin = async () => {
    setWxLoading(true);
    try {
      const { needsProfile } = await wxLogin();
      Taro.showToast({ title: '登录成功', icon: 'success' });
      const user = useAuthStore.getState().user;
      setTimeout(() => navigateAfterLogin(user), 500);
    } catch (err: any) {
      Taro.showToast({ title: err.detail || '微信登录失败', icon: 'none' });
    } finally {
      setWxLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Taro.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      Taro.showToast({ title: '登录成功', icon: 'success' });
      const user = useAuthStore.getState().user;
      setTimeout(() => navigateAfterLogin(user), 500);
    } catch (err: any) {
      Taro.showToast({ title: err.detail || '登录失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className='login-page'>
      <View className='login-header'>
        <Text className='login-title'>学习成绩分析</Text>
        <Text className='login-subtitle'>欢迎使用</Text>
      </View>

      <View className='login-form'>
        <View className='wx-login-section'>
          <View
            className='btn-wx'
            onClick={!wxLoading ? handleWxLogin : undefined}
            style={{ opacity: wxLoading ? 0.6 : 1 }}
          >
            <Text className='wx-icon'>&#xe600;</Text>
            <Text>{wxLoading ? '登录中...' : '微信一键登录'}</Text>
          </View>
          <Text className='wx-hint'>推荐使用微信账号快速登录</Text>
        </View>

        <View className='login-divider'>
          <View className='divider-line' />
          <Text className='divider-text' onClick={() => setShowAccountLogin(!showAccountLogin)}>
            {showAccountLogin ? '收起账号登录' : '账号密码登录'}
          </Text>
          <View className='divider-line' />
        </View>

        {showAccountLogin && (
          <View className='account-login-section'>
            <View className='input-item'>
              <Text className='input-label'>用户名</Text>
              <Input className='input-field' placeholder='请输入用户名' value={username} onInput={e => setUsername(e.detail.value)} />
            </View>
            <View className='input-item'>
              <Text className='input-label'>密码</Text>
              <Input className='input-field' placeholder='请输入密码' password value={password} onInput={e => setPassword(e.detail.value)} />
            </View>
            <View className='btn-primary' onClick={!loading ? handleLogin : undefined} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? '登录中...' : '登录'}
            </View>
            <View className='login-footer'>
              <Text className='text-secondary' onClick={() => Taro.navigateTo({ url: '/pages/register/index' })}>
                没有账号？去注册
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

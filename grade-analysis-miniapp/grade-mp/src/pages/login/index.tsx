import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input } from '@tarojs/components';
import { useAuthStore } from '../../stores/auth';
import './index.scss';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!username || !password) {
      Taro.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      Taro.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/student/dashboard' });
      }, 500);
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
        <Text className='login-subtitle'>登录账号</Text>
      </View>

      <View className='login-form'>
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
    </View>
  );
}

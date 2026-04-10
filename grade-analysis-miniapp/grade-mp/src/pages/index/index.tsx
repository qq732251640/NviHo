import { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { useAuthStore, checkProfileComplete } from '../../stores/auth';

export default function Index() {
  const { user, loading, fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      Taro.redirectTo({ url: '/pages/login/index' });
    } else if (!checkProfileComplete(user)) {
      Taro.redirectTo({ url: '/pages/complete-profile/index' });
    } else {
      Taro.switchTab({ url: '/pages/student/dashboard' });
    }
  }, [user, loading]);

  return (
    <View style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Text>加载中...</Text>
    </View>
  );
}

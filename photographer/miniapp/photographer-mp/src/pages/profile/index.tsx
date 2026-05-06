import { useEffect, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';

import { PhotographerListItem } from '@/types';
import { resolveImageUrl } from '@/api/client';
import { useUserStore } from '@/stores/user';
import { myFavorites } from '@/api/photographers';
import './index.scss';

export default function ProfilePage() {
  const { user, loadFromCache, refresh, logout } = useUserStore();
  const [favorites, setFavorites] = useState<PhotographerListItem[]>([]);

  useEffect(() => {
    loadFromCache();
  }, []);

  useDidShow(() => {
    refresh();
    loadFavs();
  });

  const loadFavs = async () => {
    try {
      const list = await myFavorites();
      setFavorites(list);
    } catch (e) {}
  };

  const onLogin = () => Taro.navigateTo({ url: '/pages/login/index' });
  const onLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确认退出?',
      success: (r) => {
        if (r.confirm) {
          logout();
        }
      },
    });
  };

  return (
    <View className="profile-page">
      {user ? (
        <View className="user-card">
          <Image
            className="avatar"
            src={resolveImageUrl(user.avatar)}
            mode="aspectFill"
          />
          <View className="info">
            <Text className="nickname">{user.nickname || user.username}</Text>
            <Text className="role">
              {user.pm_role === 'photographer' || user.pm_role === 'both'
                ? '摄影师'
                : user.pm_role === 'admin'
                ? '管理员'
                : '用户'}
            </Text>
          </View>
        </View>
      ) : (
        <View className="user-card guest" onClick={onLogin}>
          <Text className="login-cta">点击登录</Text>
        </View>
      )}

      <View className="menu">
        <View
          className="menu-item"
          onClick={() => {
            Taro.setStorageSync('orders_role_intent', 'buyer');
            Taro.switchTab({ url: '/pages/order/list/index' });
          }}
        >
          <Text>📋 我的订单(下单)</Text>
          <Text className="arrow">›</Text>
        </View>
        {user && (user.pm_role === 'photographer' || user.pm_role === 'both' || user.pm_role === 'admin') && (
          <View
            className="menu-item"
            onClick={() => {
              Taro.setStorageSync('orders_role_intent', 'photographer');
              Taro.switchTab({ url: '/pages/order/list/index' });
            }}
          >
            <Text>📷 我接的单(摄影师)</Text>
            <Text className="arrow">›</Text>
          </View>
        )}
        <View
          className="menu-item"
          onClick={() => {
            if (!user) onLogin();
            else if (user.pm_role === 'user') {
              Taro.navigateTo({ url: '/pages/pgr/apply/index' });
            } else {
              Taro.showToast({ title: '已是摄影师', icon: 'none' });
            }
          }}
        >
          <Text>📷 申请成为摄影师</Text>
          <Text className="arrow">›</Text>
        </View>
        <View
          className="menu-item"
          onClick={() =>
            Taro.navigateTo({ url: '/pages/agreement/index?type=user' })
          }
        >
          <Text>📜 用户协议</Text>
          <Text className="arrow">›</Text>
        </View>
        <View
          className="menu-item"
          onClick={() => Taro.showToast({ title: '客服:13800000000', icon: 'none' })}
        >
          <Text>🛟 联系客服</Text>
          <Text className="arrow">›</Text>
        </View>
        {user && (
          <View className="menu-item danger" onClick={onLogout}>
            <Text>退出登录</Text>
          </View>
        )}
      </View>

      {favorites.length > 0 && (
        <View className="favs">
          <View className="favs-title">我收藏的摄影师</View>
          {favorites.map((p) => (
            <View
              key={p.id}
              className="fav-item"
              onClick={() =>
                Taro.navigateTo({ url: `/pages/photographer/detail/index?id=${p.id}` })
              }
            >
              <Image
                className="fav-avatar"
                src={resolveImageUrl(p.avatar)}
                mode="aspectFill"
              />
              <View className="fav-info">
                <Text className="fav-name">{p.nickname}</Text>
                <Text className="fav-meta">
                  {p.completed_orders} 单 · ⭐{p.avg_rating.toFixed(1)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

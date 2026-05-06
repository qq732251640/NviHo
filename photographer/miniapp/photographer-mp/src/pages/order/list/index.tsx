import { useState } from 'react';
import Taro, { useDidShow, usePullDownRefresh, useRouter } from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';

import { OrderListItem } from '@/types';
import { fmtPrice, resolveImageUrl } from '@/api/client';
import { listOrders } from '@/api/orders';
import { useUserStore } from '@/stores/user';
import Empty from '@/components/Empty';
import './index.scss';

type OrdersRole = 'buyer' | 'photographer';

const STATUS_TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: 'all', label: '全部', statuses: [] },
  { key: 'pending_pay', label: '待支付', statuses: ['pending_pay'] },
  { key: 'pending_confirm', label: '待接单', statuses: ['pending_confirm'] },
  { key: 'accepted', label: '待拍摄', statuses: ['accepted'] },
  { key: 'shooting_done', label: '待确认', statuses: ['shooting_done'] },
  { key: 'done', label: '已完成', statuses: ['reviewed', 'auto_settled', 'settled'] },
];

const STATUS_LABELS: Record<string, string> = {
  pending_pay: '待支付',
  pending_confirm: '待接单',
  accepted: '待拍摄',
  rejected: '已拒单',
  shooting_done: '待确认收片',
  reviewed: '已评价',
  auto_settled: '已完成',
  settled: '已结算',
  user_cancelled: '已取消',
  cancelled: '已取消',
  refunded: '已退款',
};

const PHOTOGRAPHER_STATUS_TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: 'all', label: '全部', statuses: [] },
  { key: 'pending_confirm', label: '待接单', statuses: ['pending_confirm'] },
  { key: 'accepted', label: '待拍摄', statuses: ['accepted'] },
  { key: 'shooting_done', label: '待用户确认', statuses: ['shooting_done'] },
  { key: 'done', label: '已完成', statuses: ['reviewed', 'auto_settled', 'settled'] },
];

export default function OrderListPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const initialRole: OrdersRole =
    router.params.role === 'photographer' ? 'photographer' : 'buyer';

  const [role, setRole] = useState<OrdersRole>(initialRole);
  const [tab, setTab] = useState('all');
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (r: OrdersRole) => {
    setLoading(true);
    try {
      const res = await listOrders(r);
      setOrders(res);
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    // tabBar 页不能带 query, 用 storage 传角色意图(profile 页跳转时写入)
    const intent = Taro.getStorageSync('orders_role_intent') as OrdersRole | '';
    const next: OrdersRole = intent || role;
    if (intent) Taro.removeStorageSync('orders_role_intent');
    setRole(next);
    setTab('all');
    load(next);
  });

  usePullDownRefresh(async () => {
    await load(role);
    Taro.stopPullDownRefresh();
  });

  const canSwitch =
    !!user &&
    (user.pm_role === 'photographer' || user.pm_role === 'both' || user.pm_role === 'admin');

  const switchRole = (next: OrdersRole) => {
    if (next === role) return;
    setRole(next);
    setTab('all');
    load(next);
  };

  const tabs = role === 'photographer' ? PHOTOGRAPHER_STATUS_TABS : STATUS_TABS;
  const filtered = (() => {
    const tabConf = tabs.find((t) => t.key === tab);
    if (!tabConf || tabConf.statuses.length === 0) return orders;
    return orders.filter((o) => tabConf.statuses.includes(o.status));
  })();

  return (
    <View className="order-list-page">
      {canSwitch && (
        <View className="role-switch">
          <View
            className={`role-seg ${role === 'buyer' ? 'active' : ''}`}
            onClick={() => switchRole('buyer')}
          >
            我下的单
          </View>
          <View
            className={`role-seg ${role === 'photographer' ? 'active' : ''}`}
            onClick={() => switchRole('photographer')}
          >
            我接的单
          </View>
        </View>
      )}
      <View className="tabs">
        {tabs.map((t) => (
          <View
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </View>
        ))}
      </View>
      <View className="list">
        {filtered.length === 0 && !loading ? (
          <Empty text="暂无订单" />
        ) : (
          filtered.map((o) => (
            <View
              key={o.id}
              className="order-card"
              onClick={() =>
                Taro.navigateTo({
                  url: `/pages/order/detail/index?id=${o.id}${role === 'photographer' ? '&role=photographer' : ''}`,
                })
              }
            >
              <View className="head">
                <Text className="order-no">订单号 {o.order_no}</Text>
                <Text className="status">{STATUS_LABELS[o.status] || o.status}</Text>
              </View>
              <View className="body">
                <Image
                  className="avatar"
                  src={resolveImageUrl(o.photographer_avatar)}
                  mode="aspectFill"
                />
                <View className="info">
                  <Text className="name">{o.photographer_nickname}</Text>
                  <Text className="pkg">{o.package_name}</Text>
                  <Text className="meta">
                    {o.shoot_date} · {o.location}
                  </Text>
                </View>
                <Text className="price">¥{fmtPrice(o.amount_total)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

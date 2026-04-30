import { useEffect, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';

import { OrderDetail } from '@/types';
import { fmtPrice, resolveImageUrl } from '@/api/client';
import {
  cancelOrder,
  confirmOrder,
  getOrder,
  mockPay,
  prepay,
} from '@/api/orders';
import './index.scss';

const STATUS_LABELS: Record<string, string> = {
  pending_pay: '待支付',
  pending_confirm: '待摄影师接单',
  accepted: '摄影师已接单',
  rejected: '摄影师已拒单',
  shooting_done: '待您确认收片',
  reviewed: '已评价',
  auto_settled: '已完成',
  settled: '已结算',
  user_cancelled: '已取消',
  cancelled: '已取消',
  refunded: '已退款',
};

export default function OrderDetailPage() {
  const router = useRouter();
  const id = Number(router.params.id || 0);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const o = await getOrder(id);
      setOrder(o);
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const onPay = async () => {
    try {
      const params = await prepay(id);
      try {
        await Taro.requestPayment({
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType as any,
          paySign: params.paySign,
        });
        Taro.showToast({ title: '支付成功', icon: 'success' });
        load();
      } catch (e) {
        Taro.showModal({
          title: '微信支付未配置',
          content: '是否使用 Mock 支付推进订单(开发期可用,生产环境请配置商户号)?',
          success: async (r) => {
            if (r.confirm) {
              await mockPay(id);
              load();
            }
          },
        });
      }
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '支付失败', icon: 'none' });
    }
  };

  const onCancel = async () => {
    Taro.showModal({
      title: '取消订单',
      content: '确认取消此订单?',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await cancelOrder(id);
          Taro.showToast({ title: '已取消', icon: 'success' });
          load();
        } catch (e: any) {
          Taro.showToast({ title: e.detail || '取消失败', icon: 'none' });
        }
      },
    });
  };

  const onConfirm = async () => {
    try {
      await confirmOrder(id);
      Taro.showToast({ title: '已确认收片', icon: 'success' });
      load();
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '操作失败', icon: 'none' });
    }
  };

  const onReview = () => {
    Taro.navigateTo({ url: `/pages/order/review/index?id=${id}` });
  };

  if (loading || !order) {
    return <View className="loading">加载中...</View>;
  }

  return (
    <View className="order-detail">
      <View className="status-card">
        <View className="status">{STATUS_LABELS[order.status] || order.status}</View>
        <View className="order-no">订单号 {order.order_no}</View>
      </View>

      <View className="card">
        <Image
          className="avatar"
          src={resolveImageUrl(order.photographer_avatar)}
          mode="aspectFill"
        />
        <View className="info">
          <Text className="name">{order.photographer_nickname}</Text>
          <Text className="pkg">{order.package_name}</Text>
          {order.package_description && (
            <Text className="desc">{order.package_description}</Text>
          )}
        </View>
      </View>

      <View className="card">
        <View className="row">
          <Text className="label">拍摄日期</Text>
          <Text className="value">{order.shoot_date}</Text>
        </View>
        <View className="row">
          <Text className="label">拍摄地点</Text>
          <Text className="value">{order.location}</Text>
        </View>
        {order.requirements && (
          <View className="row">
            <Text className="label">需求</Text>
            <Text className="value">{order.requirements}</Text>
          </View>
        )}
        {order.contact_name && (
          <View className="row">
            <Text className="label">联系人</Text>
            <Text className="value">
              {order.contact_name} {order.contact_phone || ''}
            </Text>
          </View>
        )}
      </View>

      {order.photographer_phone && (
        <View className="card">
          <View className="row">
            <Text className="label">摄影师联系方式</Text>
            <Text className="value">{order.photographer_phone}</Text>
          </View>
        </View>
      )}

      <View className="card">
        <View className="row">
          <Text className="label">总金额</Text>
          <Text className="value price">¥{fmtPrice(order.amount_total)}</Text>
        </View>
        {order.commission > 0 && (
          <View className="row">
            <Text className="label">平台抽佣</Text>
            <Text className="value sub">
              ¥{fmtPrice(order.commission)} ({(order.commission_rate * 100).toFixed(0)}%)
            </Text>
          </View>
        )}
        {order.reject_reason && (
          <View className="row">
            <Text className="label">拒单原因</Text>
            <Text className="value">{order.reject_reason}</Text>
          </View>
        )}
        {order.delivery_url && (
          <View className="row">
            <Text className="label">成片链接</Text>
            <Text className="value">{order.delivery_url}</Text>
          </View>
        )}
      </View>

      <View className="action-bar">
        {order.status === 'pending_pay' && (
          <>
            <View className="btn-ghost" onClick={onCancel}>取消订单</View>
            <View className="btn-cta" onClick={onPay}>立即支付</View>
          </>
        )}
        {(order.status === 'pending_confirm' || order.status === 'accepted') && (
          <View className="btn-ghost" onClick={onCancel}>取消订单</View>
        )}
        {order.status === 'shooting_done' && (
          <>
            <View className="btn-ghost" onClick={onConfirm}>仅确认</View>
            <View className="btn-cta" onClick={onReview}>评价</View>
          </>
        )}
      </View>
    </View>
  );
}

import { useEffect, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';

import { OrderDetail } from '@/types';
import { fmtPrice, resolveImageUrl } from '@/api/client';
import {
  acceptOrderByPgr,
  cancelOrder,
  confirmOrder,
  getOrder,
  mockPay,
  prepay,
  rejectOrderByPgr,
} from '@/api/orders';
import { useUserStore } from '@/stores/user';
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
  const role = router.params.role === 'photographer' ? 'photographer' : 'buyer';
  const { user, loadFromCache } = useUserStore();

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
    loadFromCache();
    load();
  }, [id]);

  // 是否是当前订单的摄影师
  const isMyAsPhotographer =
    !!user?.photographer_id && order?.photographer_id === user.photographer_id;

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
          content:
            '是否使用 Mock 支付推进订单(开发期可用,生产环境请配置商户号)?',
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
    Taro.showModal({
      title: '确认收片',
      content:
        '确认收片后将释放百度云链接,且不可申诉。如对成片有异议请改用申诉。',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await confirmOrder(id);
          Taro.showToast({ title: '已确认收片', icon: 'success' });
          load();
        } catch (e: any) {
          Taro.showToast({ title: e.detail || '操作失败', icon: 'none' });
        }
      },
    });
  };

  const onReview = () => {
    Taro.navigateTo({ url: `/pages/order/review/index?id=${id}` });
  };

  // 摄影师端
  const onAccept = async () => {
    try {
      await acceptOrderByPgr(id);
      Taro.showToast({ title: '已接单', icon: 'success' });
      load();
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '操作失败', icon: 'none' });
    }
  };

  const onReject = async () => {
    Taro.showModal({
      title: '拒单',
      content: '确认拒绝此单?将自动给用户原路退款',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await rejectOrderByPgr(id, '摄影师无法接单');
          Taro.showToast({ title: '已拒单', icon: 'success' });
          load();
        } catch (e: any) {
          Taro.showToast({ title: e.detail || '操作失败', icon: 'none' });
        }
      },
    });
  };

  const onDeliver = () => {
    Taro.navigateTo({ url: `/pages/pgr/deliver/index?id=${id}` });
  };

  const onCopyDelivery = () => {
    if (!order?.delivery_url) return;
    const text = order.delivery_password
      ? `${order.delivery_url}\n提取码: ${order.delivery_password}`
      : order.delivery_url;
    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({ title: '已复制', icon: 'success' });
      },
    });
  };

  const onPreviewImages = (idx: number) => {
    if (!order?.delivery_preview_images?.length) return;
    const urls = order.delivery_preview_images.map((u) => resolveImageUrl(u));
    Taro.previewImage({ current: urls[idx], urls });
  };

  if (loading || !order) {
    return <View className="loading">加载中...</View>;
  }

  return (
    <View className="order-detail">
      <View className="status-card">
        <View className="status">
          {STATUS_LABELS[order.status] || order.status}
        </View>
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

      {/* 交付信息: 预览图始终展示, 链接根据 unlock 状态展示 */}
      {order.delivery_preview_images && order.delivery_preview_images.length > 0 && (
        <View className="card">
          <View className="card-title">
            成片预览 · 共 {order.delivery_preview_images.length} 张
          </View>
          <View className="preview-grid">
            {order.delivery_preview_images.map((url, idx) => (
              <Image
                key={idx}
                className="preview-tile"
                src={resolveImageUrl(url)}
                mode="aspectFill"
                onClick={() => onPreviewImages(idx)}
              />
            ))}
          </View>
          {order.delivery_unlocked && order.delivery_url ? (
            <View className="delivery-unlocked">
              <View className="delivery-row">
                <Text className="label">百度云链接</Text>
                <Text className="value link">{order.delivery_url}</Text>
              </View>
              {order.delivery_password && (
                <View className="delivery-row">
                  <Text className="label">提取码</Text>
                  <Text className="value pwd">{order.delivery_password}</Text>
                </View>
              )}
              {order.delivery_note && (
                <View className="delivery-row">
                  <Text className="label">备注</Text>
                  <Text className="value">{order.delivery_note}</Text>
                </View>
              )}
              <View className="copy-btn" onClick={onCopyDelivery}>
                一键复制链接和提取码
              </View>
            </View>
          ) : (
            <View className="delivery-locked">
              <View className="lock-icon">🔒</View>
              <View className="lock-text">
                完整原片下载链接将在您 <Text className="hl">确认收片</Text> 后释放
              </View>
              <View className="lock-hint">
                如对成片有异议,请在 7 天内发起申诉(申诉功能即将上线)
              </View>
            </View>
          )}
        </View>
      )}

      <View className="card">
        <View className="row">
          <Text className="label">总金额</Text>
          <Text className="value price">¥{fmtPrice(order.amount_total)}</Text>
        </View>
        {order.commission > 0 && role === 'photographer' && (
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
      </View>

      {/* 底部操作栏: 根据角色 + 状态决定按钮 */}
      <View className="action-bar">
        {/* 摄影师视角 */}
        {(role === 'photographer' || isMyAsPhotographer) && (
          <>
            {order.status === 'pending_confirm' && (
              <>
                <View className="btn-ghost" onClick={onReject}>拒单</View>
                <View className="btn-cta" onClick={onAccept}>接单</View>
              </>
            )}
            {order.status === 'accepted' && (
              <View className="btn-cta" onClick={onDeliver}>上传成片</View>
            )}
          </>
        )}

        {/* 用户视角 */}
        {role !== 'photographer' && !isMyAsPhotographer && (
          <>
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
                <View className="btn-ghost" onClick={onConfirm}>确认收片</View>
                <View className="btn-cta" onClick={onReview}>评价并确认</View>
              </>
            )}
            {(order.status === 'auto_settled' && !order.delivery_unlocked) && (
              <View className="btn-cta" onClick={onReview}>去评价</View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

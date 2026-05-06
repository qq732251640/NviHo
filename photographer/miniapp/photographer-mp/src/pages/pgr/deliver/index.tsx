import { useEffect, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Image, Input, Text, Textarea, View } from '@tarojs/components';

import { OrderDetail } from '@/types';
import { resolveImageUrl } from '@/api/client';
import { deliverOrder, getOrder } from '@/api/orders';
import './index.scss';

const MAX_PREVIEW = 12;
const MIN_PREVIEW = 6;

export default function DeliverPage() {
  const router = useRouter();
  const id = Number(router.params.id || 0);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);   // 本地选中的图片(临时路径)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);  // 上传后的 server URL
  const [uploading, setUploading] = useState(false);
  const [deliveryUrl, setDeliveryUrl] = useState('');
  const [deliveryPwd, setDeliveryPwd] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const o = await getOrder(id);
        setOrder(o);
      } catch (e: any) {
        Taro.showToast({ title: e.detail || '加载失败', icon: 'none' });
      }
    })();
  }, [id]);

  const onChooseImages = async () => {
    if (uploadedUrls.length >= MAX_PREVIEW) {
      Taro.showToast({ title: `最多 ${MAX_PREVIEW} 张`, icon: 'none' });
      return;
    }
    try {
      const res = await Taro.chooseImage({
        count: MAX_PREVIEW - uploadedUrls.length,
        sizeType: ['compressed'],
        sourceType: ['album'],
      });
      const tempPaths = res.tempFilePaths;
      setUploading(true);
      const newUrls: string[] = [];
      for (const tp of tempPaths) {
        try {
          const token = Taro.getStorageSync('access_token');
          const baseOrigin = (await import('@/api/client')).BASE_URL_EXPORT.replace(
            /\/api\/pm$/,
            ''
          );
          const upRes = await Taro.uploadFile({
            url: `${baseOrigin}/api/pm/uploads/direct`,
            filePath: tp,
            name: 'file',
            formData: { scope: 'work' },
            header: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data = JSON.parse(upRes.data || '{}');
          if (data.public_url) {
            newUrls.push(data.public_url);
          }
        } catch (e: any) {
          Taro.showToast({ title: '上传失败,跳过该图', icon: 'none' });
        }
      }
      setUploadedUrls((s) => [...s, ...newUrls]);
      setPreviews((s) => [...s, ...newUrls.map((u) => resolveImageUrl(u))]);
    } catch (e) {
      // 用户取消选择
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    setUploadedUrls((s) => s.filter((_, i) => i !== idx));
    setPreviews((s) => s.filter((_, i) => i !== idx));
  };

  const onSubmit = async () => {
    if (uploadedUrls.length < MIN_PREVIEW) {
      Taro.showToast({ title: `请至少上传 ${MIN_PREVIEW} 张预览图`, icon: 'none' });
      return;
    }
    if (!deliveryUrl.trim().startsWith('http')) {
      Taro.showToast({ title: '请填写有效的百度云链接', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      await deliverOrder(id, {
        preview_images: uploadedUrls,
        delivery_url: deliveryUrl.trim(),
        delivery_password: deliveryPwd.trim() || undefined,
        delivery_note: note.trim() || undefined,
      });
      Taro.showToast({ title: '已提交,等待用户确认', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) {
    return <View className="loading">加载中...</View>;
  }

  if (order.status !== 'accepted') {
    return (
      <View className="deliver-page">
        <View className="card">
          <View className="warn">
            订单状态为「{order.status}」,不可上传成片
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="deliver-page">
      <View className="card">
        <View className="card-title">订单</View>
        <View className="card-body">
          {order.user_nickname || '用户'} · {order.package_name}
        </View>
        <View className="card-meta">
          {order.shoot_date} · {order.location}
        </View>
      </View>

      <View className="card">
        <View className="card-title">
          预览图 (必传 {MIN_PREVIEW}-{MAX_PREVIEW} 张, 建议是精修)
        </View>
        <View className="hint">
          这些图会在小程序内向用户展示,自动加平台水印。用户确认收片前看不到百度云链接。
        </View>
        <View className="image-grid">
          {previews.map((url, idx) => (
            <View key={idx} className="image-tile">
              <Image className="thumb" src={url} mode="aspectFill" />
              <View className="remove" onClick={() => removeImage(idx)}>×</View>
            </View>
          ))}
          {previews.length < MAX_PREVIEW && (
            <View
              className={`image-tile add ${uploading ? 'disabled' : ''}`}
              onClick={uploading ? undefined : onChooseImages}
            >
              <Text className="plus">+</Text>
              <Text className="add-label">
                {uploading ? '上传中...' : `${previews.length}/${MAX_PREVIEW}`}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View className="card">
        <View className="card-title">百度云链接 *</View>
        <Input
          className="input"
          placeholder="https://pan.baidu.com/s/..."
          value={deliveryUrl}
          onInput={(e: any) => setDeliveryUrl(e.detail.value)}
        />
      </View>

      <View className="card">
        <View className="card-title">提取码 (可选)</View>
        <Input
          className="input"
          placeholder="如: a1b2"
          maxlength={20}
          value={deliveryPwd}
          onInput={(e: any) => setDeliveryPwd(e.detail.value)}
        />
      </View>

      <View className="card">
        <View className="card-title">备注 (可选)</View>
        <Textarea
          className="textarea"
          placeholder="如: 含原片+精修,建议在电脑端下载"
          maxlength={500}
          value={note}
          onInput={(e: any) => setNote(e.detail.value)}
        />
      </View>

      <View className="bottom-bar">
        <View
          className={`submit-btn ${submitting ? 'disabled' : ''}`}
          onClick={submitting ? undefined : onSubmit}
        >
          {submitting ? '提交中...' : '提交交付'}
        </View>
      </View>
    </View>
  );
}

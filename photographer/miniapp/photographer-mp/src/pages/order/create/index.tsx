import { useEffect, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Input, Picker, Text, Textarea, View } from '@tarojs/components';

import { Package, PhotographerDetail } from '@/types';
import { fmtPrice } from '@/api/client';
import { getPhotographer, getSchedule } from '@/api/photographers';
import { createOrder } from '@/api/orders';
import './index.scss';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function OrderCreatePage() {
  const router = useRouter();
  const photographerId = Number(router.params.photographer_id || 0);
  const initialPackageId = Number(router.params.package_id || 0);

  const [pgr, setPgr] = useState<PhotographerDetail | null>(null);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [shootDate, setShootDate] = useState<string>(todayStr());
  const [busyDates, setBusyDates] = useState<Set<string>>(new Set());
  const [location, setLocation] = useState('');
  const [requirements, setRequirements] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!photographerId) return;
    try {
      const detail = await getPhotographer(photographerId);
      setPgr(detail);
      const found = detail.packages.find((p) => p.id === initialPackageId)
        || detail.packages[0];
      if (found) setPkg(found);

      const month = shootDate.slice(0, 7);
      const sch = await getSchedule(photographerId, month);
      const busy = new Set(
        sch.filter((s) => s.status === 'busy' || s.status === 'blocked').map((s) => s.date)
      );
      setBusyDates(busy);
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '加载失败', icon: 'none' });
    }
  };

  useEffect(() => {
    load();
  }, [photographerId]);

  const submit = async () => {
    if (!pkg) {
      Taro.showToast({ title: '请选择套餐', icon: 'none' });
      return;
    }
    if (!location.trim()) {
      Taro.showToast({ title: '请填写拍摄地点', icon: 'none' });
      return;
    }
    if (busyDates.has(shootDate)) {
      Taro.showToast({ title: '该日期摄影师不可约', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        photographer_id: photographerId,
        package_id: pkg.id,
        shoot_date: shootDate,
        location: location.trim(),
        requirements: requirements.trim() || undefined,
        contact_name: contactName.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
      });
      Taro.showToast({ title: '订单已创建', icon: 'success' });
      setTimeout(() => {
        Taro.redirectTo({ url: `/pages/order/detail/index?id=${order.id}` });
      }, 600);
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!pgr) {
    return <View className="loading">加载中...</View>;
  }

  return (
    <View className="create-order">
      <View className="card">
        <View className="card-title">摄影师</View>
        <View className="card-body">{pgr.nickname} · {pgr.base_city}</View>
      </View>

      <View className="card">
        <View className="card-title">选择套餐</View>
        {pgr.packages.map((p) => (
          <View
            key={p.id}
            className={`pkg-row ${pkg?.id === p.id ? 'active' : ''}`}
            onClick={() => setPkg(p)}
          >
            <View>
              <Text className="pkg-name">{p.name}</Text>
              <Text className="pkg-meta">
                {p.duration_hours}h · 精修 {p.photos_count} 张
              </Text>
            </View>
            <Text className="pkg-price">¥{fmtPrice(p.price)}</Text>
          </View>
        ))}
      </View>

      <View className="card">
        <View className="card-title">拍摄日期</View>
        <Picker
          mode="date"
          value={shootDate}
          start={todayStr()}
          onChange={(e: any) => setShootDate(e.detail.value)}
        >
          <View className="picker-row">
            <Text>{shootDate}</Text>
            <Text className="picker-arrow">›</Text>
          </View>
        </Picker>
        {busyDates.has(shootDate) && (
          <View className="warn-row">该日期摄影师已被预约,请换一天</View>
        )}
      </View>

      <View className="card">
        <View className="card-title">拍摄地点</View>
        <Input
          className="input"
          placeholder="如:晋祠 / 万象城 / 摄影师工作室"
          value={location}
          onInput={(e: any) => setLocation(e.detail.value)}
        />
      </View>

      <View className="card">
        <View className="card-title">需求备注 (选填)</View>
        <Textarea
          className="textarea"
          placeholder="风格偏好、特殊要求、人数等"
          value={requirements}
          onInput={(e: any) => setRequirements(e.detail.value)}
        />
      </View>

      <View className="card">
        <View className="card-title">联系人</View>
        <Input
          className="input"
          placeholder="姓名"
          value={contactName}
          onInput={(e: any) => setContactName(e.detail.value)}
        />
        <Input
          className="input"
          type="number"
          placeholder="手机号"
          value={contactPhone}
          onInput={(e: any) => setContactPhone(e.detail.value)}
        />
      </View>

      <View className="bottom-bar">
        <View className="amount">
          总计 <Text className="price">¥{fmtPrice(pkg?.price || 0)}</Text>
        </View>
        <View className="submit-btn" onClick={submitting ? undefined : submit}>
          {submitting ? '提交中...' : '确认下单'}
        </View>
      </View>
    </View>
  );
}

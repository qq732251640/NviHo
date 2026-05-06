import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Text, Textarea, View } from '@tarojs/components';

import { Category } from '@/types';
import { request } from '@/api/client';
import { listCategories } from '@/api/categories';
import { useUserStore } from '@/stores/user';
import './index.scss';

interface ApplyForm {
  nickname: string;
  intro: string;
  contact_phone: string;
  contact_wechat: string;
  base_city: string;
  service_radius_km: number;
  external_portfolio_url: string;
  years_of_experience: number;
  category_ids: number[];
}

export default function PgrApplyPage() {
  const { user, refresh } = useUserStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ApplyForm>({
    nickname: '',
    intro: '',
    contact_phone: '',
    contact_wechat: '',
    base_city: '太原',
    service_radius_km: 50,
    external_portfolio_url: '',
    years_of_experience: 1,
    category_ids: [],
  });
  const [acceptPgr, setAcceptPgr] = useState(false);
  const [acceptCommit, setAcceptCommit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cs = await listCategories();
        setCategories(cs);
      } catch (e) {}
    })();
    if (user?.nickname) {
      setForm((f) => ({ ...f, nickname: user.nickname || '' }));
    }
  }, [user]);

  const update = <K extends keyof ApplyForm>(k: K, v: ApplyForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleCategory = (id: number) => {
    setForm((f) => ({
      ...f,
      category_ids: f.category_ids.includes(id)
        ? f.category_ids.filter((x) => x !== id)
        : [...f.category_ids, id],
    }));
  };

  const onSubmit = async () => {
    if (!form.nickname.trim()) {
      Taro.showToast({ title: '请填写艺名', icon: 'none' });
      return;
    }
    if (!form.intro.trim()) {
      Taro.showToast({ title: '请写简介', icon: 'none' });
      return;
    }
    if (!form.contact_phone.trim()) {
      Taro.showToast({ title: '请填写联系电话', icon: 'none' });
      return;
    }
    if (form.category_ids.length === 0) {
      Taro.showToast({ title: '至少勾选 1 个擅长品类', icon: 'none' });
      return;
    }
    if (!acceptPgr || !acceptCommit) {
      Taro.showToast({ title: '请勾选 2 份协议', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      await request({
        url: '/pgr/apply',
        method: 'POST',
        data: {
          ...form,
          accept_photographer_agreement: true,
          accept_service_commitment: true,
        },
      });
      await refresh();
      Taro.showModal({
        title: '已提交申请',
        content: '我们将在 3-5 个工作日内审核,通过后可在小程序中接单。',
        showCancel: false,
        success: () => Taro.navigateBack(),
      });
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="apply-page">
      <View className="card">
        <View className="card-title">基本信息</View>
        <View className="form-item">
          <Text className="lbl">艺名 / 工作室名 *</Text>
          <Input
            className="ipt"
            value={form.nickname}
            placeholder="如:路明摄影"
            onInput={(e: any) => update('nickname', e.detail.value)}
          />
        </View>
        <View className="form-item">
          <Text className="lbl">简介 *</Text>
          <Textarea
            className="txa"
            value={form.intro}
            placeholder="介绍风格、经验、擅长场景"
            maxlength={300}
            onInput={(e: any) => update('intro', e.detail.value)}
          />
        </View>
        <View className="form-row">
          <View className="form-item flex-1">
            <Text className="lbl">手机号 *</Text>
            <Input
              className="ipt"
              type="number"
              value={form.contact_phone}
              onInput={(e: any) => update('contact_phone', e.detail.value)}
            />
          </View>
          <View className="form-item flex-1">
            <Text className="lbl">微信号</Text>
            <Input
              className="ipt"
              value={form.contact_wechat}
              onInput={(e: any) => update('contact_wechat', e.detail.value)}
            />
          </View>
        </View>
        <View className="form-row">
          <View className="form-item flex-1">
            <Text className="lbl">基地城市</Text>
            <Input
              className="ipt"
              value={form.base_city}
              onInput={(e: any) => update('base_city', e.detail.value)}
            />
          </View>
          <View className="form-item flex-1">
            <Text className="lbl">从业年限</Text>
            <Input
              className="ipt"
              type="number"
              value={String(form.years_of_experience)}
              onInput={(e: any) =>
                update('years_of_experience', parseInt(e.detail.value || '0', 10))
              }
            />
          </View>
        </View>
        <View className="form-item">
          <Text className="lbl">外部作品集 (可选)</Text>
          <Input
            className="ipt"
            placeholder="时光盒子 / 小红书 / 公众号"
            value={form.external_portfolio_url}
            onInput={(e: any) => update('external_portfolio_url', e.detail.value)}
          />
        </View>
      </View>

      <View className="card">
        <View className="card-title">擅长品类 (可多选)</View>
        <View className="cats">
          {categories.map((c) => (
            <View
              key={c.id}
              className={`cat ${form.category_ids.includes(c.id) ? 'active' : ''}`}
              onClick={() => toggleCategory(c.id)}
            >
              {c.icon} {c.name}
            </View>
          ))}
        </View>
      </View>

      <View className="card agreements">
        <View className="card-title">协议确认 *</View>
        <View
          className={`agreement-row ${acceptPgr ? 'active' : ''}`}
          onClick={() => setAcceptPgr((s) => !s)}
        >
          <View className={`box ${acceptPgr ? 'checked' : ''}`}>
            {acceptPgr ? '✓' : ''}
          </View>
          <Text className="text">
            我已阅读并同意{' '}
            <Text
              className="link"
              onClick={(e: any) => {
                e.stopPropagation && e.stopPropagation();
                Taro.navigateTo({
                  url: '/pages/agreement/index?type=photographer',
                });
              }}
            >
              《摄影师入驻协议》
            </Text>
          </Text>
        </View>
        <View
          className={`agreement-row ${acceptCommit ? 'active' : ''}`}
          onClick={() => setAcceptCommit((s) => !s)}
        >
          <View className={`box ${acceptCommit ? 'checked' : ''}`}>
            {acceptCommit ? '✓' : ''}
          </View>
          <Text className="text">
            我已阅读并同意{' '}
            <Text
              className="link"
              onClick={(e: any) => {
                e.stopPropagation && e.stopPropagation();
                Taro.navigateTo({
                  url: '/pages/agreement/index?type=service_commitment',
                });
              }}
            >
              《服务承诺书》
            </Text>
          </Text>
        </View>
      </View>

      <View className="bottom-bar">
        <View
          className={`submit ${submitting || !acceptPgr || !acceptCommit ? 'disabled' : ''}`}
          onClick={
            submitting || !acceptPgr || !acceptCommit ? undefined : onSubmit
          }
        >
          {submitting ? '提交中...' : '提交入驻申请'}
        </View>
      </View>
    </View>
  );
}

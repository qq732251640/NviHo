import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Picker } from '@tarojs/components';
import { useAuthStore } from '../../stores/auth';
import { authApi, schoolApi } from '../../api';
import './index.scss';

const GRADE_LEVEL_MAP: Record<string, string> = { elementary: '小学', middle: '初中', high: '高中' };
const GRADE_LEVELS = ['小学', '初中', '高中'];
const GRADE_LEVEL_VALUES: Record<string, string> = { '小学': 'elementary', '初中': 'middle', '高中': 'high' };
const ROLES = ['学生', '教师'];
const ROLE_VALUES: Record<string, string> = { '学生': 'student', '教师': 'teacher' };

export default function Profile() {
  const { user, setUser, logout } = useAuthStore();
  const credits = user?.credits || 0;
  const currentLevel = user?.grade_level ? GRADE_LEVEL_MAP[user.grade_level] || '' : '';
  const currentRole = user?.role === 'teacher' ? '教师' : '学生';

  // Switch school/grade form
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [provIdx, setProvIdx] = useState(-1);
  const [cityIdx, setCityIdx] = useState(-1);
  const [distIdx, setDistIdx] = useState(-1);
  const [formGradeLevel, setFormGradeLevel] = useState('');
  const [formSchoolName, setFormSchoolName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authApi.getMe().then(setUser);
  }, []);

  const loadRegions = () => {
    if (regions.length > 0) return;
    schoolApi.getRegionTree().then(setRegions);
  };

  const initFormDefaults = () => {
    setFormGradeLevel(currentLevel || '高中');
    setFormSchoolName(user?.school_name || '');
    setProvIdx(-1);
    setCityIdx(-1);
    setDistIdx(-1);

    if (regions.length > 0 && user?.region_path && user.region_path.length >= 1) {
      const pIdx = regions.findIndex((r: any) => r.id === user.region_path![0]);
      if (pIdx >= 0) {
        setProvIdx(pIdx);
        if (user.region_path.length >= 2) {
          const cIdx = (regions[pIdx]?.children || []).findIndex((c: any) => c.id === user.region_path![1]);
          if (cIdx >= 0) {
            setCityIdx(cIdx);
            if (user.region_path.length >= 3) {
              const dIdx = (regions[pIdx]?.children?.[cIdx]?.children || []).findIndex((d: any) => d.id === user.region_path![2]);
              if (dIdx >= 0) setDistIdx(dIdx);
            }
          }
        }
      }
    }
  };

  const provinces = regions.map((p: any) => p.name);
  const cities = provIdx >= 0 ? (regions[provIdx]?.children || []).map((c: any) => c.name) : [];
  const districts = provIdx >= 0 && cityIdx >= 0
    ? (regions[provIdx]?.children?.[cityIdx]?.children || []).map((d: any) => d.name) : [];

  const getSelectedRegionId = () => {
    if (provIdx < 0) return undefined;
    const prov = regions[provIdx];
    if (cityIdx < 0) return prov?.id;
    const city = prov?.children?.[cityIdx];
    if (distIdx < 0) return city?.id;
    return city?.children?.[distIdx]?.id || city?.id;
  };

  const regionLabel = () => {
    const parts: string[] = [];
    if (provIdx >= 0) parts.push(provinces[provIdx]);
    if (cityIdx >= 0) parts.push(cities[cityIdx]);
    if (distIdx >= 0) parts.push(districts[distIdx]);
    return parts.length > 0 ? parts.join(' / ') : '请选择地区';
  };

  // Handlers
  const handleSwitchRole = () => {
    Taro.showActionSheet({ itemList: ROLES }).then(async (res) => {
      const selected = ROLES[res.tapIndex];
      const roleValue = ROLE_VALUES[selected];
      if (roleValue === user?.role) {
        Taro.showToast({ title: `当前已是${selected}`, icon: 'none' });
        return;
      }
      try {
        const r = await authApi.switchRole();
        setUser(r);
        Taro.showToast({ title: `已切换为${selected}`, icon: 'success' });
        setTimeout(() => Taro.reLaunch({ url: '/pages/index/index' }), 800);
      } catch (err: any) {
        Taro.showToast({ title: err.detail || '切换失败', icon: 'none' });
      }
    }).catch(() => {});
  };

  const openSchoolForm = () => {
    loadRegions();
    setTimeout(() => {
      initFormDefaults();
      setShowSchoolForm(true);
    }, 300);
  };

  const handleSaveSchool = async () => {
    const glValue = GRADE_LEVEL_VALUES[formGradeLevel];
    if (!glValue) {
      Taro.showToast({ title: '请选择学段', icon: 'none' });
      return;
    }
    if (!formSchoolName.trim()) {
      Taro.showToast({ title: '请输入学校名称', icon: 'none' });
      return;
    }
    const regionId = getSelectedRegionId();
    if (!regionId) {
      Taro.showToast({ title: '请选择地区', icon: 'none' });
      return;
    }

    setSaving(true);
    try {
      const r = await authApi.updateSchool({
        school_name: formSchoolName,
        region_id: regionId,
        grade_level: glValue,
      });
      setUser(r);
      Taro.showToast({ title: `已切换到 ${r.school_name} · ${GRADE_LEVEL_MAP[glValue]}`, icon: 'success' });
      setShowSchoolForm(false);
    } catch (err: any) {
      Taro.showToast({ title: err.detail || '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  const handleRecharge = () => {
    Taro.showModal({
      title: '充值', content: '模拟充值 10 次 AI 分析额度', confirmText: '充值',
    }).then(async (res) => {
      if (res.confirm) {
        try {
          const r = await authApi.recharge(10);
          setUser(r);
          Taro.showToast({ title: '充值成功 +10次', icon: 'success' });
        } catch (err: any) {
          Taro.showToast({ title: err.detail || '充值失败', icon: 'none' });
        }
      }
    });
  };

  const handleLogout = () => {
    Taro.showModal({ title: '提示', content: '确定退出登录？' }).then(res => {
      if (res.confirm) logout();
    });
  };

  const freeReport = Math.max(0, 2 - (user?.free_report_used || 0));
  const freePaper = Math.max(0, 2 - (user?.free_paper_used || 0));

  if (showSchoolForm) {
    return (
      <View className='profile-page'>
        <Text className='title'>切换学段 / 学校</Text>
        <Text className='text-secondary' style={{ display: 'block', marginBottom: '24px' }}>
          当前：{user?.school_name} · {currentLevel}
        </Text>

        <View className='card'>
          <View className='input-item'>
            <Text className='input-label'>学段</Text>
            <Picker mode='selector' range={GRADE_LEVELS} value={GRADE_LEVELS.indexOf(formGradeLevel)}
              onChange={e => setFormGradeLevel(GRADE_LEVELS[e.detail.value as number])}>
              <View className='input-field'>{formGradeLevel || '请选择'}</View>
            </Picker>
          </View>

          <View className='input-item'>
            <Text className='input-label'>省份</Text>
            <Picker mode='selector' range={provinces.length > 0 ? provinces : ['加载中...']} value={Math.max(provIdx, 0)}
              onChange={e => { setProvIdx(e.detail.value as number); setCityIdx(-1); setDistIdx(-1); }}>
              <View className='input-field'>{provIdx >= 0 ? provinces[provIdx] : '请选择省份'}</View>
            </Picker>
          </View>

          {provIdx >= 0 && cities.length > 0 && (
            <View className='input-item'>
              <Text className='input-label'>城市</Text>
              <Picker mode='selector' range={cities} value={Math.max(cityIdx, 0)}
                onChange={e => { setCityIdx(e.detail.value as number); setDistIdx(-1); }}>
                <View className='input-field'>{cityIdx >= 0 ? cities[cityIdx] : '请选择城市'}</View>
              </Picker>
            </View>
          )}

          {cityIdx >= 0 && districts.length > 0 && (
            <View className='input-item'>
              <Text className='input-label'>区/县</Text>
              <Picker mode='selector' range={districts} value={Math.max(distIdx, 0)}
                onChange={e => setDistIdx(e.detail.value as number)}>
                <View className='input-field'>{distIdx >= 0 ? districts[distIdx] : '请选择区/县'}</View>
              </Picker>
            </View>
          )}

          {provIdx >= 0 && (
            <Text className='text-secondary' style={{ display: 'block', marginBottom: '16px' }}>
              已选：{regionLabel()}
            </Text>
          )}

          <View className='input-item'>
            <Text className='input-label'>学校名称</Text>
            <Input className='input-field' placeholder='输入学校名称' value={formSchoolName}
              onInput={e => setFormSchoolName(e.detail.value)} />
          </View>
        </View>

        <View className='btn-primary' style={{ marginTop: '24px', opacity: saving ? 0.6 : 1 }}
          onClick={!saving ? handleSaveSchool : undefined}>
          {saving ? '保存中...' : '确认切换'}
        </View>
        <View className='btn-outline' style={{ marginTop: '16px' }} onClick={() => setShowSchoolForm(false)}>
          取消
        </View>
      </View>
    );
  }

  return (
    <View className='profile-page'>
      <View className='profile-header'>
        <View className='avatar'>{user?.real_name?.slice(0, 1) || '?'}</View>
        <View className='profile-info'>
          <Text className='profile-name'>{user?.real_name}</Text>
          <Text className='profile-detail'>
            {currentRole} · {currentLevel} · {user?.school_name}
          </Text>
          {user?.student_no && <Text className='profile-detail'>学号：{user.student_no}</Text>}
        </View>
      </View>

      <View className='card'>
        <Text className='subtitle'>AI 额度</Text>
        <View className='credit-row'>
          <View className='credit-item'>
            <Text className='credit-value' style={{ color: '#52c41a' }}>{freeReport}</Text>
            <Text className='credit-label'>免费分析</Text>
          </View>
          <View className='credit-item'>
            <Text className='credit-value' style={{ color: '#52c41a' }}>{freePaper}</Text>
            <Text className='credit-label'>免费试卷</Text>
          </View>
          <View className='credit-item'>
            <Text className='credit-value' style={{ color: '#faad14' }}>{credits}</Text>
            <Text className='credit-label'>付费额度</Text>
          </View>
        </View>
        <View className='btn-primary' style={{ marginTop: '16px' }} onClick={handleRecharge}>
          充值额度
        </View>
      </View>

      <View className='card'>
        <Text className='subtitle'>账号管理</Text>

        <View className='menu-item' onClick={handleSwitchRole}>
          <Text>切换角色</Text>
          <Text className='menu-right'>当前：{currentRole} →</Text>
        </View>

        <View className='menu-item' onClick={openSchoolForm}>
          <Text>切换学段/学校</Text>
          <Text className='menu-right'>{currentLevel} · {user?.school_name} →</Text>
        </View>
      </View>

      <View className='btn-logout' onClick={handleLogout}>
        退出登录
      </View>
    </View>
  );
}

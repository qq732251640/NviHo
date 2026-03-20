import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Picker } from '@tarojs/components';
import { authApi, schoolApi } from '../../api';
import './index.scss';

const ROLES = ['学生', '教师'];
const GRADE_LEVELS = ['小学', '初中', '高中'];
const GRADE_LEVEL_MAP: Record<string, string> = { '小学': 'elementary', '初中': 'middle', '高中': 'high' };

export default function Register() {
  const [form, setForm] = useState({
    username: '', password: '', real_name: '', student_no: '',
    role: '学生', grade_level: '高中', school_name: '', grade_name: '',
  });
  const [regions, setRegions] = useState<any[]>([]);
  const [provIdx, setProvIdx] = useState(-1);
  const [cityIdx, setCityIdx] = useState(-1);
  const [distIdx, setDistIdx] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    schoolApi.getRegionTree().then(setRegions);
  }, []);

  const provinces = regions.map(p => p.name);
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
    return parts.length > 0 ? parts.join(' / ') : '请选择';
  };

  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.real_name || !form.school_name) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    if (form.role === '学生' && !form.student_no) {
      Taro.showToast({ title: '学生必须填写学号', icon: 'none' });
      return;
    }
    if (provIdx < 0) {
      Taro.showToast({ title: '请选择所在地区', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        username: form.username,
        password: form.password,
        real_name: form.real_name,
        role: form.role === '教师' ? 'teacher' : 'student',
        school_name: form.school_name,
        region_id: getSelectedRegionId(),
        grade_level: GRADE_LEVEL_MAP[form.grade_level],
        grade_name: form.grade_name || undefined,
        student_no: form.student_no || undefined,
      });
      Taro.showToast({ title: '注册成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (err: any) {
      Taro.showToast({ title: err.detail || '注册失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className='register-page'>
      <View className='form-card'>
        <Text className='title'>用户注册</Text>

        <View className='input-item'>
          <Text className='input-label'>角色</Text>
          <Picker mode='selector' range={ROLES} value={ROLES.indexOf(form.role)}
            onChange={e => setForm({ ...form, role: ROLES[e.detail.value as number] })}>
            <View className='input-field'>{form.role}</View>
          </Picker>
        </View>

        <View className='input-item'>
          <Text className='input-label'>用户名</Text>
          <Input className='input-field' placeholder='请输入用户名' value={form.username}
            onInput={e => setForm({ ...form, username: e.detail.value })} />
        </View>

        <View className='input-item'>
          <Text className='input-label'>密码</Text>
          <Input className='input-field' placeholder='密码至少6位' password value={form.password}
            onInput={e => setForm({ ...form, password: e.detail.value })} />
        </View>

        <View className='input-item'>
          <Text className='input-label'>真实姓名</Text>
          <Input className='input-field' placeholder='请输入真实姓名' value={form.real_name}
            onInput={e => setForm({ ...form, real_name: e.detail.value })} />
        </View>

        {form.role === '学生' && (
          <View className='input-item'>
            <Text className='input-label'>学号</Text>
            <Input className='input-field' placeholder='请输入学号' value={form.student_no}
              onInput={e => setForm({ ...form, student_no: e.detail.value })} />
          </View>
        )}

        <View className='input-item'>
          <Text className='input-label'>学段</Text>
          <Picker mode='selector' range={GRADE_LEVELS} value={GRADE_LEVELS.indexOf(form.grade_level)}
            onChange={e => setForm({ ...form, grade_level: GRADE_LEVELS[e.detail.value as number] })}>
            <View className='input-field'>{form.grade_level}</View>
          </Picker>
        </View>

        <View className='input-item'>
          <Text className='input-label'>省份</Text>
          <Picker mode='selector' range={provinces} value={Math.max(provIdx, 0)}
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

        {(provIdx >= 0) && (
          <View style={{ marginBottom: '16px' }}>
            <Text className='text-secondary'>已选：{regionLabel()}</Text>
          </View>
        )}

        <View className='input-item'>
          <Text className='input-label'>学校名称</Text>
          <Input className='input-field' placeholder='输入学校名称（自动创建）' value={form.school_name}
            onInput={e => setForm({ ...form, school_name: e.detail.value })} />
        </View>

        <View className='input-item'>
          <Text className='input-label'>年级（选填）</Text>
          <Input className='input-field' placeholder='如：高一、初二' value={form.grade_name}
            onInput={e => setForm({ ...form, grade_name: e.detail.value })} />
        </View>

        <View className='btn-primary' onClick={!loading ? handleSubmit : undefined}
          style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? '注册中...' : '注册'}
        </View>
      </View>
    </View>
  );
}

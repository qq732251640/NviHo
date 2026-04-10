import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Picker } from '@tarojs/components';
import { useAuthStore } from '../../stores/auth';
import { authApi, schoolApi } from '../../api';
import './index.scss';

const ROLES = ['学生', '教师'];
const GRADE_LEVELS = ['小学', '初中', '高中'];
const GRADE_LEVEL_MAP: Record<string, string> = { '小学': 'elementary', '初中': 'middle', '高中': 'high' };

export default function CompleteProfile() {
  const { setUser } = useAuthStore();

  const [step, setStep] = useState<'role' | 'school'>('role');
  const [form, setForm] = useState({
    role: '学生',
    real_name: '',
    student_no: '',
    grade_level: '高中',
    school_name: '',
    grade_name: '',
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

  const handleNextStep = () => {
    if (!form.real_name) {
      Taro.showToast({ title: '请输入真实姓名', icon: 'none' });
      return;
    }
    if (form.role === '学生' && !form.student_no) {
      Taro.showToast({ title: '学生必须填写学号', icon: 'none' });
      return;
    }
    setStep('school');
  };

  const handleSubmit = async () => {
    if (!form.school_name) {
      Taro.showToast({ title: '请输入学校名称', icon: 'none' });
      return;
    }
    if (provIdx < 0) {
      Taro.showToast({ title: '请选择所在地区', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      const data = {
        real_name: form.real_name,
        role: form.role === '教师' ? 'teacher' : 'student',
        school_name: form.school_name,
        region_id: getSelectedRegionId(),
        grade_level: GRADE_LEVEL_MAP[form.grade_level],
        grade_name: form.grade_name || undefined,
        student_no: form.student_no || undefined,
      };
      const updated = await authApi.completeProfile(data);
      setUser(updated);
      Taro.showToast({ title: '信息完善成功', icon: 'success' });
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/student/dashboard' });
      }, 800);
    } catch (err: any) {
      Taro.showToast({ title: err.detail || '保存失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'role') {
    return (
      <View className='complete-profile-page'>
        <View className='step-header'>
          <Text className='step-tag'>第 1 步</Text>
          <Text className='step-title'>选择角色与基本信息</Text>
          <Text className='step-desc'>请完善您的身份信息以获得更好的使用体验</Text>
        </View>

        <View className='form-card'>
          <View className='input-item'>
            <Text className='input-label'>角色</Text>
            <Picker mode='selector' range={ROLES} value={ROLES.indexOf(form.role)}
              onChange={e => setForm({ ...form, role: ROLES[e.detail.value as number] })}>
              <View className='input-field picker-field'>{form.role}<Text className='arrow'>▼</Text></View>
            </Picker>
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
              <View className='input-field picker-field'>{form.grade_level}<Text className='arrow'>▼</Text></View>
            </Picker>
          </View>

          <View className='input-item'>
            <Text className='input-label'>年级（选填）</Text>
            <Input className='input-field' placeholder='如：高一、初二' value={form.grade_name}
              onInput={e => setForm({ ...form, grade_name: e.detail.value })} />
          </View>

          <View className='btn-primary' onClick={handleNextStep}>
            下一步：选择学校
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className='complete-profile-page'>
      <View className='step-header'>
        <Text className='step-tag'>第 2 步</Text>
        <Text className='step-title'>选择学校</Text>
        <Text className='step-desc'>选择您所在的地区和学校</Text>
      </View>

      <View className='form-card'>
        <View className='input-item'>
          <Text className='input-label'>省份</Text>
          <Picker mode='selector' range={provinces.length > 0 ? provinces : ['加载中...']} value={Math.max(provIdx, 0)}
            onChange={e => { setProvIdx(e.detail.value as number); setCityIdx(-1); setDistIdx(-1); }}>
            <View className='input-field picker-field'>
              {provIdx >= 0 ? provinces[provIdx] : '请选择省份'}<Text className='arrow'>▼</Text>
            </View>
          </Picker>
        </View>

        {provIdx >= 0 && cities.length > 0 && (
          <View className='input-item'>
            <Text className='input-label'>城市</Text>
            <Picker mode='selector' range={cities} value={Math.max(cityIdx, 0)}
              onChange={e => { setCityIdx(e.detail.value as number); setDistIdx(-1); }}>
              <View className='input-field picker-field'>
                {cityIdx >= 0 ? cities[cityIdx] : '请选择城市'}<Text className='arrow'>▼</Text>
              </View>
            </Picker>
          </View>
        )}

        {cityIdx >= 0 && districts.length > 0 && (
          <View className='input-item'>
            <Text className='input-label'>区/县</Text>
            <Picker mode='selector' range={districts} value={Math.max(distIdx, 0)}
              onChange={e => setDistIdx(e.detail.value as number)}>
              <View className='input-field picker-field'>
                {distIdx >= 0 ? districts[distIdx] : '请选择区/县'}<Text className='arrow'>▼</Text>
              </View>
            </Picker>
          </View>
        )}

        {provIdx >= 0 && (
          <View style={{ marginBottom: '16px' }}>
            <Text className='region-selected'>已选：{regionLabel()}</Text>
          </View>
        )}

        <View className='input-item'>
          <Text className='input-label'>学校名称</Text>
          <Input className='input-field' placeholder='输入学校名称（自动创建）' value={form.school_name}
            onInput={e => setForm({ ...form, school_name: e.detail.value })} />
        </View>

        <View className='btn-primary' onClick={!loading ? handleSubmit : undefined}
          style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? '提交中...' : '完成'}
        </View>

        <View className='btn-outline' onClick={() => setStep('role')}>
          上一步
        </View>
      </View>
    </View>
  );
}

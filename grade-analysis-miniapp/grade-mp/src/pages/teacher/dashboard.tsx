import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { analysisApi } from '../../api';
import { useAuthStore } from '../../stores/auth';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any[]>([]);

  useEffect(() => {
    analysisApi.getStats().then(setStats);
    analysisApi.listStudents().then(setStudents);
    analysisApi.getDistribution().then(setDistribution);
  }, []);

  return (
    <View className='container'>
      <Text className='title'>教师首页</Text>
      <Text className='text-secondary' style={{ display: 'block', marginBottom: '24px' }}>
        {user?.school_name} · {user?.grade_name || ''}
      </Text>

      <View className='stat-row'>
        <View className='stat-card'>
          <Text className='stat-value'>{students.length}</Text>
          <Text className='stat-label'>学生人数</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-value'>{stats?.average?.toFixed(1) ?? '-'}</Text>
          <Text className='stat-label'>平均分</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-value'>{stats?.highest ?? '-'}</Text>
          <Text className='stat-label'>最高分</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-value'>{stats?.count ?? 0}</Text>
          <Text className='stat-label'>考试记录</Text>
        </View>
      </View>

      <View className='card' style={{ marginTop: '24px' }}>
        <Text className='subtitle'>成绩分布</Text>
        {distribution.length > 0 ? distribution.map((d: any) => (
          <View key={d.range_label} className='list-item'>
            <Text>{d.range_label}</Text>
            <Text style={{ fontWeight: 'bold' }}>{d.count}人 ({d.percentage}%)</Text>
          </View>
        )) : <Text className='text-secondary'>暂无数据</Text>}
      </View>

      <View className='card'>
        <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <Text className='subtitle' style={{ margin: 0 }}>学生列表</Text>
          <Text className='text-secondary'>共 {students.length} 人</Text>
        </View>
        {students.length > 0 ? students.map((s: any) => (
          <View key={s.id} className='list-item'>
            <Text style={{ fontWeight: 'bold' }}>{s.real_name}</Text>
            <Text className='text-secondary'>{s.student_no} · {s.grade_name}</Text>
          </View>
        )) : <Text className='text-secondary'>暂无学生</Text>}
      </View>

      <View className='card'>
        <Text className='subtitle'>快捷入口</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {[
            { label: '排名', url: '/pages/teacher/ranking' },
            { label: '趋势', url: '/pages/teacher/trends' },
            { label: '分布', url: '/pages/teacher/distribution' },
            { label: '对比', url: '/pages/teacher/comparison' },
            { label: '预测', url: '/pages/teacher/prediction' },
          ].map(item => (
            <View key={item.label} className='btn-outline' style={{ flex: 1, minWidth: '120px' }}
              onClick={() => Taro.navigateTo({ url: item.url })}>
              {item.label}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

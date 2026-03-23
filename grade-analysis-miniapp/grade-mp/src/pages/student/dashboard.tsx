import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { useAuthStore } from '../../stores/auth';
import { analysisApi, gradeApi } from '../../api';

const GRADE_LEVEL_MAP: Record<string, string> = { elementary: '小学', middle: '初中', high: '高中' };

function StudentView() {
  const { user } = useAuthStore();
  const [examCount, setExamCount] = useState(0);
  const [gradeCount, setGradeCount] = useState(0);
  const [latestExam, setLatestExam] = useState('');
  const [latestGrades, setLatestGrades] = useState<any[]>([]);
  const [avgRate, setAvgRate] = useState(0);

  useEffect(() => {
    analysisApi.listExams().then((data: any[]) => {
      setExamCount(data.length);
      if (data.length > 0) setLatestExam(data[0].exam_name);
    });
    gradeApi.getMyGrades().then((data: any[]) => {
      setGradeCount(data.length);
      if (data.length > 0) {
        const firstExam = data[0]?.exam_name;
        const latest = data.filter(g => g.exam_name === firstExam);
        setLatestGrades(latest.slice(0, 5));
        const rates = latest.map(g => g.total_score > 0 ? (g.score / g.total_score) * 100 : 0);
        if (rates.length > 0) setAvgRate(Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 10) / 10);
      }
    });
  }, []);

  const level = user?.grade_level ? GRADE_LEVEL_MAP[user.grade_level] || '' : '';
  const rateColor = avgRate >= 90 ? '#52c41a' : avgRate >= 80 ? '#1890ff' : avgRate >= 70 ? '#faad14' : '#ff4d4f';

  return (
    <View className='container' style={{ paddingBottom: '32px' }}>
      {/* Header Card */}
      <View style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #a78bfa 100%)', borderRadius: '0 0 32px 32px', padding: '32px 24px 40px', margin: '-24px -24px 24px', color: '#fff' }}>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <View>
            <Text style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', display: 'block' }}>
              {user?.real_name}，{getGreeting()}
            </Text>
            <Text style={{ fontSize: '24px', color: 'rgba(255,255,255,0.75)', display: 'block', marginTop: '6px' }}>
              {user?.school_name} · {level} · {user?.grade_name || ''}
            </Text>
          </View>
          <View style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: '36px', color: '#fff', fontWeight: 'bold' }}>{user?.real_name?.slice(0, 1)}</Text>
          </View>
        </View>

        {/* Mini Stats in header */}
        <View style={{ display: 'flex', gap: '12px' }}>
          <View style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <Text style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', display: 'block' }}>{avgRate || '--'}%</Text>
            <Text style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)' }}>综合得分率</Text>
          </View>
          <View style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <Text style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', display: 'block' }}>{examCount}</Text>
            <Text style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)' }}>考试次数</Text>
          </View>
          <View style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <Text style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', display: 'block' }}>{gradeCount}</Text>
            <Text style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)' }}>成绩记录</Text>
          </View>
        </View>
      </View>

      {/* Slogan */}
      <View style={{ textAlign: 'center', padding: '8px 0 20px' }}>
        <Text style={{ fontSize: '22px', color: '#999', lineHeight: '1.8' }}>
          成绩了解到位，真实水平全定位{'\n'}优势短板对位，学习规划更到位
        </Text>
      </View>

      {/* Latest Exam Quick Look */}
      {latestGrades.length > 0 && (
        <View className='card' style={{ marginBottom: '16px' }}>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Text className='subtitle' style={{ margin: 0 }}>最近考试</Text>
            <Text style={{ fontSize: '22px', color: '#5b21b6' }}>{latestExam}</Text>
          </View>
          {latestGrades.map((g, i) => (
            <View key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < latestGrades.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
              <Text style={{ fontSize: '26px', color: '#333' }}>{g.subject_name}</Text>
              <View style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text style={{ fontSize: '22px', color: '#999' }}>{g.score}/{g.total_score}</Text>
                <Text style={{ fontSize: '26px', fontWeight: 'bold', color: g.total_score > 0 && g.score / g.total_score >= 0.9 ? '#52c41a' : g.total_score > 0 && g.score / g.total_score >= 0.6 ? '#1890ff' : '#ff4d4f' }}>
                  {g.total_score > 0 ? Math.round(g.score / g.total_score * 100) : 0}%
                </Text>
              </View>
            </View>
          ))}
          {latestGrades.length >= 5 && (
            <Text style={{ textAlign: 'center', display: 'block', marginTop: '12px', fontSize: '22px', color: '#5b21b6' }}
              onClick={() => Taro.switchTab({ url: '/pages/student/grades' })}>
              查看全部成绩 →
            </Text>
          )}
        </View>
      )}

      {/* Empty state - guide to upload */}
      {latestGrades.length === 0 && (
        <View className='card' style={{ marginBottom: '16px', textAlign: 'center', padding: '32px 24px' }}>
          <Text style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>📊</Text>
          <Text style={{ fontSize: '30px', fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '8px' }}>还没有成绩数据</Text>
          <Text style={{ fontSize: '24px', color: '#999', display: 'block', marginBottom: '20px' }}>上传你的考试成绩，开启智能分析之旅</Text>
          <View className='btn-primary' style={{ display: 'inline-block', padding: '16px 48px', fontSize: '28px' }}
            onClick={() => Taro.switchTab({ url: '/pages/student/upload' })}>
            去上传成绩 →
          </View>
        </View>
      )}

      {/* Analysis Tools - Main 2 */}
      <View style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <View style={{ flex: 1, background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', borderRadius: '16px', padding: '24px 20px' }}
          onClick={() => Taro.navigateTo({ url: '/pages/student/comparison' })}>
          <Text style={{ fontSize: '30px', fontWeight: 'bold', color: '#fff', display: 'block' }}>对比分布</Text>
          <Text style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)', display: 'block', marginTop: '6px' }}>雷达图 · 分布 · 优势</Text>
        </View>
        <View style={{ flex: 1, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', borderRadius: '16px', padding: '24px 20px' }}
          onClick={() => Taro.navigateTo({ url: '/pages/student/trends' })}>
          <Text style={{ fontSize: '30px', fontWeight: 'bold', color: '#fff', display: 'block' }}>趋势预测</Text>
          <Text style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)', display: 'block', marginTop: '6px' }}>折线 · 预测 · 稳定率</Text>
        </View>
      </View>

      {/* Quick Tools - 4 small buttons */}
      <View style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <View style={{ flex: 1, background: '#f0e6ff', borderRadius: '12px', padding: '18px 12px', textAlign: 'center' }}
          onClick={() => Taro.switchTab({ url: '/pages/student/grades' })}>
          <Text style={{ fontSize: '28px', display: 'block' }}>🔍</Text>
          <Text style={{ fontSize: '22px', color: '#5b21b6', marginTop: '4px' }}>成绩查询</Text>
        </View>
        <View style={{ flex: 1, background: '#e6f7ff', borderRadius: '12px', padding: '18px 12px', textAlign: 'center' }}
          onClick={() => Taro.switchTab({ url: '/pages/student/upload' })}>
          <Text style={{ fontSize: '28px', display: 'block' }}>📝</Text>
          <Text style={{ fontSize: '22px', color: '#1890ff', marginTop: '4px' }}>上传成绩</Text>
        </View>
        <View style={{ flex: 1, background: '#f6ffed', borderRadius: '12px', padding: '18px 12px', textAlign: 'center' }}
          onClick={() => Taro.switchTab({ url: '/pages/student/analysis' })}>
          <Text style={{ fontSize: '28px', display: 'block' }}>🤖</Text>
          <Text style={{ fontSize: '22px', color: '#52c41a', marginTop: '4px' }}>AI报告</Text>
        </View>
        <View style={{ flex: 1, background: '#fff7e6', borderRadius: '12px', padding: '18px 12px', textAlign: 'center' }}
          onClick={() => Taro.navigateTo({ url: '/pages/student/papers' })}>
          <Text style={{ fontSize: '28px', display: 'block' }}>📄</Text>
          <Text style={{ fontSize: '22px', color: '#fa8c16', marginTop: '4px' }}>试卷分析</Text>
        </View>
      </View>
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function TeacherView() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    analysisApi.getStats().then(setStats);
    analysisApi.listStudents().then(setStudents);
  }, []);

  return (
    <View className='container'>
      <Text className='title'>教师首页</Text>
      <Text className='text-secondary' style={{ display: 'block', marginBottom: '24px' }}>{user?.school_name} · {user?.grade_name || ''}</Text>
      <View className='stat-row'>
        <View className='stat-card'><Text className='stat-value'>{students.length}</Text><Text className='stat-label'>学生人数</Text></View>
        <View className='stat-card'><Text className='stat-value'>{stats?.average?.toFixed(1) ?? '-'}</Text><Text className='stat-label'>平均分</Text></View>
        <View className='stat-card'><Text className='stat-value'>{stats?.highest ?? '-'}</Text><Text className='stat-label'>最高分</Text></View>
        <View className='stat-card'><Text className='stat-value'>{stats?.count ?? 0}</Text><Text className='stat-label'>考试记录</Text></View>
      </View>
      <View className='card' style={{ marginTop: '24px' }}>
        <Text className='subtitle'>学生列表 ({students.length}人)</Text>
        {students.slice(0, 10).map((s: any) => (
          <View key={s.id} className='list-item'><Text style={{ fontWeight: 'bold' }}>{s.real_name}</Text><Text className='text-secondary'>{s.student_no} · {s.grade_name}</Text></View>
        ))}
      </View>
      <View className='card'>
        <Text className='subtitle'>快捷入口</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {[{ label: '排名', url: '/pages/teacher/ranking' }, { label: '趋势', url: '/pages/teacher/trends' },
            { label: '分布', url: '/pages/teacher/distribution' }, { label: '对比', url: '/pages/teacher/comparison' },
            { label: '预测', url: '/pages/teacher/prediction' },
          ].map(item => (
            <View key={item.label} className='btn-outline' style={{ flex: 1, minWidth: '120px' }}
              onClick={() => Taro.navigateTo({ url: item.url })}>{item.label}</View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function Dashboard() {
  const { user, fetchUser } = useAuthStore();
  useEffect(() => { fetchUser(); }, []);
  return user?.role === 'teacher' ? <TeacherView /> : <StudentView />;
}

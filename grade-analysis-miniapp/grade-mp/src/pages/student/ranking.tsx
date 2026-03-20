import { useEffect, useState, useRef } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Canvas, Picker } from '@tarojs/components';
import { analysisApi, gradeApi } from '../../api';

interface RankedSubject {
  subject_name: string;
  score: number;
  total_score: number;
  rate: number;
}

function getRateColor(rate: number): string {
  if (rate >= 90) return '#52c41a';
  if (rate >= 80) return '#1890ff';
  if (rate >= 70) return '#faad14';
  if (rate >= 60) return '#fa8c16';
  return '#ff4d4f';
}

export default function StudentRanking() {
  const [exams, setExams] = useState<any[]>([]);
  const [examIdx, setExamIdx] = useState(0);
  const [grades, setGrades] = useState<any[]>([]);
  const [ranked, setRanked] = useState<RankedSubject[]>([]);

  useEffect(() => {
    analysisApi.listExams().then(setExams);
    gradeApi.getMyGrades().then((res: any) => setGrades(Array.isArray(res) ? res : []));
  }, []);

  useEffect(() => {
    if (!grades.length) return;
    const examName = exams.length > 0 ? exams[examIdx]?.exam_name : null;
    const filtered = examName ? grades.filter((g: any) => g.exam_name === examName) : grades;
    const items: RankedSubject[] = filtered.map((g: any) => ({
      subject_name: g.subject_name,
      score: g.score,
      total_score: g.total_score,
      rate: g.total_score > 0 ? (g.score / g.total_score) * 100 : 0,
    }));
    items.sort((a, b) => b.rate - a.rate);
    setRanked(items);
  }, [grades, exams, examIdx]);

  const best = ranked[0];
  const worst = ranked.length > 0 ? ranked[ranked.length - 1] : null;

  return (
    <View className='container'>
      <Text className='title'>得分率排名</Text>

      <View className='stat-row' style={{ marginBottom: '24px' }}>
        <View className='stat-card'>
          <Text className='stat-value' style={{ color: '#52c41a', fontSize: '32px' }}>
            {best?.subject_name || '-'}
          </Text>
          <Text className='stat-label'>最强科 {best ? best.rate.toFixed(1) + '%' : ''}</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-value' style={{ color: '#ff4d4f', fontSize: '32px' }}>
            {worst?.subject_name || '-'}
          </Text>
          <Text className='stat-label'>最弱科 {worst ? worst.rate.toFixed(1) + '%' : ''}</Text>
        </View>
      </View>

      {exams.length > 0 && (
        <View style={{ marginBottom: '24px' }}>
          <Picker
            mode='selector'
            range={exams.map((e: any) => e.exam_name)}
            value={examIdx}
            onChange={e => setExamIdx(Number(e.detail.value))}
          >
            <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px', display: 'inline-block' }}>
              {exams[examIdx]?.exam_name || '选择考试'}
            </View>
          </Picker>
        </View>
      )}

      {ranked.length > 0 ? (
        <View className='card' style={{ padding: '24px' }}>
          {ranked.map((item, i) => (
            <View key={item.subject_name} style={{ marginBottom: i < ranked.length - 1 ? '20px' : '0' }}>
              <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Text style={{ fontWeight: 'bold', fontSize: '28px' }}>{item.subject_name}</Text>
                <Text style={{ color: '#666', fontSize: '24px' }}>
                  {item.score}/{item.total_score} · {item.rate.toFixed(1)}%
                </Text>
              </View>
              <View style={{ background: '#f0f0f0', borderRadius: '8px', height: '24px', overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${Math.min(item.rate, 100)}%`,
                    height: '100%',
                    borderRadius: '8px',
                    background: getRateColor(item.rate),
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text className='empty-text'>暂无成绩数据</Text>
      )}

      <View className='card' style={{ padding: '20px' }}>
        <Text className='subtitle'>图例</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {[
            { label: '≥90% 优秀', color: '#52c41a' },
            { label: '≥80% 良好', color: '#1890ff' },
            { label: '≥70% 中等', color: '#faad14' },
            { label: '≥60% 及格', color: '#fa8c16' },
            { label: '<60% 不及格', color: '#ff4d4f' },
          ].map(l => (
            <View key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <View style={{ width: '20px', height: '20px', borderRadius: '4px', background: l.color }} />
              <Text style={{ fontSize: '22px', color: '#666' }}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

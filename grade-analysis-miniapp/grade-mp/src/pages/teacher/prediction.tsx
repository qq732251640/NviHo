import { useEffect, useState } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import { analysisApi } from '../../api';

export default function TeacherPrediction() {
  const [students, setStudents] = useState<any[]>([]);
  const [studentIdx, setStudentIdx] = useState(0);
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    analysisApi.listStudents().then(setStudents);
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      analysisApi
        .getPrediction(students[studentIdx]?.id)
        .then(setPredictions)
        .catch(() => setPredictions([]));
    }
  }, [studentIdx, students]);

  return (
    <View className='container'>
      <Text className='title'>成绩预测</Text>

      <View style={{ marginBottom: '24px' }}>
        <Picker mode='selector' range={students.map(s => s.real_name || s.student_name)} value={studentIdx}
          onChange={e => setStudentIdx(Number(e.detail.value))}>
          <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px' }}>
            {students[studentIdx]?.real_name || students[studentIdx]?.student_name || '选择学生'}
          </View>
        </Picker>
      </View>

      <Text className='text-secondary' style={{ display: 'block', marginBottom: '24px' }}>
        基于该学生历史成绩趋势的智能预测
      </Text>

      {predictions.length > 0 ? predictions.map((item, i) => {
        const diff = item.predicted_score - (item.last_score || 0);
        const trend = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
        const trendColor = diff > 0 ? '#52c41a' : diff < 0 ? '#ff4d4f' : '#999';

        return (
          <View key={i} className='card' style={{ padding: '20px' }}>
            <Text style={{ fontWeight: 'bold', fontSize: '30px', marginBottom: '16px', display: 'block' }}>
              {item.subject_name}
            </Text>
            <View className='stat-row'>
              <View className='stat-card'>
                <Text className='stat-value'>{item.predicted_score?.toFixed(1)}</Text>
                <Text className='stat-label'>预测分数</Text>
              </View>
              <View className='stat-card'>
                <Text className='stat-value' style={{ color: '#666' }}>{item.last_score ?? '-'}</Text>
                <Text className='stat-label'>上次成绩</Text>
              </View>
              <View className='stat-card'>
                <Text style={{ fontSize: '40px', fontWeight: 'bold', color: trendColor }}>{trend}</Text>
                <Text className='stat-label'>
                  {diff > 0 ? '+' : ''}{item.last_score != null ? diff.toFixed(1) : '-'}
                </Text>
              </View>
            </View>
          </View>
        );
      }) : <Text className='empty-text'>暂无预测数据（需要至少两次考试成绩）</Text>}
    </View>
  );
}

import { useEffect, useState } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import { analysisApi, schoolApi } from '../../api';

export default function TeacherTrends() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjectIdx, setSubjectIdx] = useState(-1);
  const [studentIdx, setStudentIdx] = useState(-1);
  const [trends, setTrends] = useState<any[]>([]);

  useEffect(() => {
    schoolApi.getMySubjects().then(setSubjects);
    analysisApi.listStudents().then(setStudents);
  }, []);

  useEffect(() => {
    const params: any = {};
    if (subjectIdx >= 0) params.subject_id = subjects[subjectIdx]?.id;
    if (studentIdx >= 0) params.student_id = students[studentIdx]?.id;
    analysisApi.getTrends(params).then(setTrends).catch(() => setTrends([]));
  }, [subjectIdx, studentIdx, subjects, students]);

  return (
    <View className='container'>
      <View style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <Picker mode='selector' range={['全部学生', ...students.map(s => s.real_name || s.student_name)]}
          value={studentIdx + 1} onChange={e => setStudentIdx(Number(e.detail.value) - 1)}>
          <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px' }}>
            {studentIdx >= 0 ? (students[studentIdx]?.real_name || students[studentIdx]?.student_name) : '全部学生'}
          </View>
        </Picker>
        <Picker mode='selector' range={['全部科目', ...subjects.map(s => s.name)]}
          value={subjectIdx + 1} onChange={e => setSubjectIdx(Number(e.detail.value) - 1)}>
          <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px' }}>
            {subjectIdx >= 0 ? subjects[subjectIdx]?.name : '全部科目'}
          </View>
        </Picker>
      </View>

      {trends.length > 0 ? trends.map((item, i) => {
        const prev = i < trends.length - 1 ? trends[i + 1]?.score : null;
        const diff = prev != null ? item.score - prev : 0;
        const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '';
        const arrowColor = diff > 0 ? '#52c41a' : diff < 0 ? '#ff4d4f' : '#999';

        return (
          <View key={i} className='card' style={{ padding: '20px' }}>
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontWeight: 'bold' }}>{item.student_name || ''}</Text>
                <Text style={{ marginLeft: '8px' }}>{item.exam_name}</Text>
                {item.subject_name && <Text className='text-secondary' style={{ marginLeft: '8px' }}>{item.subject_name}</Text>}
                <Text className='text-secondary' style={{ display: 'block', marginTop: '4px' }}>{item.exam_date}</Text>
              </View>
              <View style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text style={{ fontSize: '36px', fontWeight: 'bold', color: '#5b21b6' }}>{item.score}</Text>
                {arrow && (
                  <Text style={{ fontSize: '28px', color: arrowColor, fontWeight: 'bold' }}>
                    {arrow}{Math.abs(diff)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      }) : <Text className='empty-text'>暂无趋势数据</Text>}
    </View>
  );
}

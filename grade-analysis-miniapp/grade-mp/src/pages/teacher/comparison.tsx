import { useEffect, useState } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import { analysisApi } from '../../api';

export default function TeacherComparison() {
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [examIdx, setExamIdx] = useState(0);
  const [studentIdx, setStudentIdx] = useState(0);
  const [comparison, setComparison] = useState<any[]>([]);

  useEffect(() => {
    analysisApi.listExams().then(setExams);
    analysisApi.listStudents().then(setStudents);
  }, []);

  useEffect(() => {
    if (exams.length > 0 && students.length > 0) {
      analysisApi
        .getComparison(exams[examIdx]?.exam_name, students[studentIdx]?.id)
        .then(setComparison)
        .catch(() => setComparison([]));
    }
  }, [examIdx, studentIdx, exams, students]);

  return (
    <View className='container'>
      <View style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <Picker mode='selector' range={students.map(s => s.real_name || s.student_name)} value={studentIdx}
          onChange={e => setStudentIdx(Number(e.detail.value))}>
          <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px' }}>
            {students[studentIdx]?.real_name || students[studentIdx]?.student_name || '选择学生'}
          </View>
        </Picker>
        <Picker mode='selector' range={exams.map(e => e.exam_name)} value={examIdx}
          onChange={e => setExamIdx(Number(e.detail.value))}>
          <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px' }}>
            {exams[examIdx]?.exam_name || '选择考试'}
          </View>
        </Picker>
      </View>

      {comparison.length > 0 ? (
        <View className='card' style={{ padding: '20px' }}>
          <View className='list-item' style={{ borderBottom: '2px solid #e8e8e8', paddingTop: 0 }}>
            <Text style={{ flex: 1, fontWeight: 'bold', color: '#666' }}>科目</Text>
            <Text style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', color: '#666' }}>个人</Text>
            <Text style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', color: '#666' }}>班均</Text>
            <Text style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', color: '#666' }}>差值</Text>
          </View>
          {comparison.map((item, i) => {
            const myScore = item.my_score ?? item.score;
            const diff = myScore - item.class_average;
            return (
              <View key={i} className='list-item'>
                <Text style={{ flex: 1, fontWeight: 'bold' }}>{item.subject_name}</Text>
                <Text style={{ width: '80px', textAlign: 'center', color: '#5b21b6', fontWeight: 'bold' }}>
                  {myScore}
                </Text>
                <Text style={{ width: '80px', textAlign: 'center', color: '#999' }}>
                  {item.class_average?.toFixed(1)}
                </Text>
                <Text style={{
                  width: '80px', textAlign: 'center', fontWeight: 'bold',
                  color: diff > 0 ? '#52c41a' : diff < 0 ? '#ff4d4f' : '#999',
                }}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : <Text className='empty-text'>暂无对比数据</Text>}
    </View>
  );
}

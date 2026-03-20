import { useEffect, useState } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import { analysisApi, schoolApi } from '../../api';

export default function TeacherRanking() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [examIdx, setExamIdx] = useState(0);
  const [ranking, setRanking] = useState<any[]>([]);

  useEffect(() => {
    schoolApi.getMySubjects().then(setSubjects);
    analysisApi.listExams().then(setExams);
  }, []);

  useEffect(() => {
    if (subjects.length > 0 && exams.length > 0) {
      analysisApi
        .getRanking(subjects[subjectIdx]?.id, exams[examIdx]?.exam_name)
        .then(setRanking)
        .catch(() => setRanking([]));
    }
  }, [subjectIdx, examIdx, subjects, exams]);

  return (
    <View className='container'>
      <View style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <Picker mode='selector' range={subjects.map(s => s.name)} value={subjectIdx}
          onChange={e => setSubjectIdx(Number(e.detail.value))}>
          <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px' }}>
            {subjects[subjectIdx]?.name || '选择科目'}
          </View>
        </Picker>
        <Picker mode='selector' range={exams.map(e => e.exam_name)} value={examIdx}
          onChange={e => setExamIdx(Number(e.detail.value))}>
          <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px' }}>
            {exams[examIdx]?.exam_name || '选择考试'}
          </View>
        </Picker>
      </View>

      {ranking.length > 0 ? ranking.map((item, i) => (
        <View key={i} className='card' style={{ padding: '20px' }}>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Text style={{ fontSize: '36px', fontWeight: 'bold', color: i < 3 ? '#faad14' : '#999', width: '60px' }}>
                {item.rank}
              </Text>
              <Text style={{ fontWeight: 'bold' }}>{item.student_name}</Text>
            </View>
            <Text style={{ fontSize: '36px', fontWeight: 'bold', color: '#5b21b6' }}>{item.score}</Text>
          </View>
        </View>
      )) : <Text className='empty-text'>暂无排名数据</Text>}
    </View>
  );
}

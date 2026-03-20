import { useEffect, useState } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import { analysisApi, schoolApi } from '../../api';

const RANGE_CONFIG = [
  { key: '90-100', label: '90-100 优秀', tagClass: 'tag-green' },
  { key: '80-89', label: '80-89 良好', tagClass: 'tag-blue' },
  { key: '70-79', label: '70-79 中等', tagClass: 'tag-gold' },
  { key: '60-69', label: '60-69 及格', tagClass: 'tag-purple' },
  { key: '0-59', label: '0-59 不及格', tagClass: 'tag-red' },
];

export default function TeacherDistribution() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [subjectIdx, setSubjectIdx] = useState(-1);
  const [examIdx, setExamIdx] = useState(-1);
  const [distribution, setDistribution] = useState<any>(null);

  useEffect(() => {
    schoolApi.getMySubjects().then(setSubjects);
    analysisApi.listExams().then(setExams);
  }, []);

  useEffect(() => {
    const params: any = {};
    if (subjectIdx >= 0) params.subject_id = subjects[subjectIdx]?.id;
    if (examIdx >= 0) params.exam_name = exams[examIdx]?.exam_name;
    analysisApi.getDistribution(params).then(setDistribution).catch(() => setDistribution(null));
  }, [subjectIdx, examIdx, subjects, exams]);

  return (
    <View className='container'>
      <Text className='title'>班级成绩分布</Text>

      <View style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <Picker mode='selector' range={['全部科目', ...subjects.map(s => s.name)]}
          value={subjectIdx + 1} onChange={e => setSubjectIdx(Number(e.detail.value) - 1)}>
          <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px' }}>
            {subjectIdx >= 0 ? subjects[subjectIdx]?.name : '全部科目'}
          </View>
        </Picker>
        <Picker mode='selector' range={['全部考试', ...exams.map(e => e.exam_name)]}
          value={examIdx + 1} onChange={e => setExamIdx(Number(e.detail.value) - 1)}>
          <View className='btn-outline' style={{ padding: '12px 20px', fontSize: '24px' }}>
            {examIdx >= 0 ? exams[examIdx]?.exam_name : '全部考试'}
          </View>
        </Picker>
      </View>

      {distribution ? RANGE_CONFIG.map(range => {
        const items = distribution[range.key] || [];
        const count = typeof items === 'number' ? items : items.length;
        return (
          <View key={range.key} className='card' style={{ padding: '20px' }}>
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <Text className={`tag ${range.tagClass}`}>{range.label}</Text>
              <Text style={{ fontWeight: 'bold', color: '#5b21b6' }}>{count} 人</Text>
            </View>
            {Array.isArray(items) && items.length > 0 && (
              <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {items.map((s: any, i: number) => (
                  <Text key={i} style={{ fontSize: '24px', color: '#666', background: '#f5f5f5', padding: '4px 12px', borderRadius: '6px' }}>
                    {s.student_name} {s.score != null ? `(${s.score})` : ''}
                  </Text>
                ))}
              </View>
            )}
          </View>
        );
      }) : <Text className='empty-text'>加载中...</Text>}
    </View>
  );
}

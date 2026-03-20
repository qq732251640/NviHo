import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Picker, Input } from '@tarojs/components';
import { gradeApi, schoolApi, analysisApi } from '../../api';
import { useAuthStore } from '../../stores/auth';

function StudentGradesView() {
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [subjectIdx, setSubjectIdx] = useState(-1);
  const [examIdx, setExamIdx] = useState(-1);

  useEffect(() => { schoolApi.getMySubjects().then(setSubjects); analysisApi.listExams().then(setExams); }, []);
  useEffect(() => {
    const params: any = {};
    if (subjectIdx >= 0) params.subject_id = subjects[subjectIdx]?.id;
    if (examIdx >= 0) params.exam_name = exams[examIdx]?.exam_name;
    gradeApi.list(params).then(setGrades);
  }, [subjectIdx, examIdx, subjects, exams]);

  const handleDelete = (id: number) => {
    Taro.showModal({ title: '确认', content: '确定删除？' }).then(res => {
      if (res.confirm) gradeApi.delete(id).then(() => { Taro.showToast({ title: '已删除', icon: 'success' }); setGrades(prev => prev.filter(g => g.id !== id)); });
    });
  };

  return (
    <View className='container'>
      <View style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <Picker mode='selector' range={['全部科目', ...subjects.map(s => s.name)]} value={subjectIdx + 1} onChange={e => setSubjectIdx(Number(e.detail.value) - 1)}>
          <View className='btn-outline' style={{ padding: '10px 16px', fontSize: '24px' }}>{subjectIdx >= 0 ? subjects[subjectIdx]?.name : '全部科目'}</View>
        </Picker>
        <Picker mode='selector' range={['全部考试', ...exams.map(e => e.exam_name)]} value={examIdx + 1} onChange={e => setExamIdx(Number(e.detail.value) - 1)}>
          <View className='btn-outline' style={{ padding: '10px 16px', fontSize: '24px' }}>{examIdx >= 0 ? exams[examIdx]?.exam_name : '全部考试'}</View>
        </Picker>
      </View>
      {grades.length > 0 ? grades.map(g => (
        <View key={g.id} className='card' style={{ padding: '16px' }}>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <View><Text style={{ fontWeight: 'bold', fontSize: '28px' }}>{g.subject_name}</Text><Text className='text-secondary' style={{ marginLeft: '12px' }}>{g.exam_name}</Text></View>
            <Text className={`tag ${g.score >= 90 ? 'tag-green' : g.score >= 60 ? 'tag-blue' : 'tag-red'}`} style={{ fontSize: '30px', fontWeight: 'bold' }}>{g.score}</Text>
          </View>
          <View style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <Text className='text-secondary'>满分 {g.total_score} | {g.exam_date}</Text>
            <Text style={{ color: '#ff4d4f', fontSize: '24px' }} onClick={() => handleDelete(g.id)}>删除</Text>
          </View>
        </View>
      )) : <Text className='empty-text'>暂无成绩</Text>}
    </View>
  );
}

function TeacherGradesView() {
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentIdx, setStudentIdx] = useState(-1);
  const [subjectIdx, setSubjectIdx] = useState(-1);
  const [examIdx, setExamIdx] = useState(-1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const loadGrades = () => {
    const params: any = {};
    if (studentIdx >= 0) params.student_id = students[studentIdx]?.id;
    if (subjectIdx >= 0) params.subject_id = subjects[subjectIdx]?.id;
    if (examIdx >= 0) params.exam_name = exams[examIdx]?.exam_name;
    gradeApi.list(params).then(setGrades);
  };

  useEffect(() => { schoolApi.getMySubjects().then(setSubjects); analysisApi.listExams().then(setExams); analysisApi.listStudents().then(setStudents); }, []);
  useEffect(() => { loadGrades(); }, [studentIdx, subjectIdx, examIdx]);

  const toggleSelect = (id: number) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };
  const handleBatchDelete = () => {
    Taro.showModal({ title: '批量删除', content: `确定删除 ${selectedIds.size} 条？` }).then(r => {
      if (r.confirm) gradeApi.batchDelete(Array.from(selectedIds)).then((res: any) => { Taro.showToast({ title: res.message, icon: 'success' }); setSelectedIds(new Set()); loadGrades(); });
    });
  };

  return (
    <View className='container'>
      <View style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <Picker mode='selector' range={['全部学生', ...students.map(s => s.real_name)]} value={studentIdx + 1} onChange={e => setStudentIdx(Number(e.detail.value) - 1)}>
          <View className='btn-outline' style={{ padding: '8px 14px', fontSize: '22px' }}>{studentIdx >= 0 ? students[studentIdx]?.real_name : '全部学生'}</View>
        </Picker>
        <Picker mode='selector' range={['全部科目', ...subjects.map(s => s.name)]} value={subjectIdx + 1} onChange={e => setSubjectIdx(Number(e.detail.value) - 1)}>
          <View className='btn-outline' style={{ padding: '8px 14px', fontSize: '22px' }}>{subjectIdx >= 0 ? subjects[subjectIdx]?.name : '全部科目'}</View>
        </Picker>
        <Picker mode='selector' range={['全部考试', ...exams.map(e => e.exam_name)]} value={examIdx + 1} onChange={e => setExamIdx(Number(e.detail.value) - 1)}>
          <View className='btn-outline' style={{ padding: '8px 14px', fontSize: '22px' }}>{examIdx >= 0 ? exams[examIdx]?.exam_name : '全部考试'}</View>
        </Picker>
      </View>
      {selectedIds.size > 0 && (
        <View style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#ff4d4f', fontWeight: 'bold' }}>已选 {selectedIds.size} 条</Text>
          <View style={{ color: '#fff', background: '#ff4d4f', padding: '8px 20px', borderRadius: '8px', fontSize: '24px' }} onClick={handleBatchDelete}>批量删除</View>
        </View>
      )}
      {grades.length > 0 ? grades.map(g => (
        <View key={g.id} className='card' style={{ padding: '14px' }} onClick={() => toggleSelect(g.id)}>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <View style={{ width: '32px', height: '32px', borderRadius: '6px', border: '2px solid #ddd', background: selectedIds.has(g.id) ? '#5b21b6' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedIds.has(g.id) && <Text style={{ color: '#fff', fontSize: '20px' }}>✓</Text>}
              </View>
              <View><Text style={{ fontWeight: 'bold' }}>{g.student_name}</Text><Text className='text-secondary' style={{ marginLeft: '8px' }}>{g.student_no}</Text></View>
            </View>
            {editingId === g.id ? (
              <Input type='digit' value={editScore} style={{ width: '90px', background: '#f8f8f8', borderRadius: '8px', padding: '4px 8px', textAlign: 'right' }}
                onInput={e => setEditScore(e.detail.value)} onClick={e => e.stopPropagation()} />
            ) : (
              <Text className={`tag ${g.score >= 90 ? 'tag-green' : g.score >= 60 ? 'tag-blue' : 'tag-red'}`} style={{ fontSize: '28px', fontWeight: 'bold' }}>{g.score}</Text>
            )}
          </View>
          <View style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <Text className='text-secondary' style={{ fontSize: '22px' }}>{g.subject_name} · {g.exam_name} · {g.exam_date}</Text>
            <View style={{ display: 'flex', gap: '14px' }} onClick={e => e.stopPropagation()}>
              {editingId === g.id ? (
                <>
                  <Text style={{ color: '#5b21b6', fontSize: '22px' }} onClick={() => { gradeApi.update(g.id, { score: parseFloat(editScore) }).then(() => { setEditingId(null); loadGrades(); }); }}>保存</Text>
                  <Text style={{ color: '#999', fontSize: '22px' }} onClick={() => setEditingId(null)}>取消</Text>
                </>
              ) : (
                <>
                  <Text style={{ color: '#5b21b6', fontSize: '22px' }} onClick={() => { setEditingId(g.id); setEditScore(String(g.score)); }}>修改</Text>
                  <Text style={{ color: '#ff4d4f', fontSize: '22px' }} onClick={() => { Taro.showModal({ title: '确认', content: '删除？' }).then(r => { if (r.confirm) gradeApi.delete(g.id).then(loadGrades); }); }}>删除</Text>
                </>
              )}
            </View>
          </View>
        </View>
      )) : <Text className='empty-text'>暂无成绩</Text>}
    </View>
  );
}

export default function GradesPage() {
  const { user } = useAuthStore();
  return (
    <View>
      <Text className='title' style={{ padding: '24px 24px 0' }}>{user?.role === 'teacher' ? '成绩管理' : '成绩查看'}</Text>
      {user?.role === 'teacher' ? <TeacherGradesView /> : <StudentGradesView />}
    </View>
  );
}

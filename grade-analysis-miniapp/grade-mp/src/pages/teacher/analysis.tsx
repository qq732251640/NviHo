import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Picker } from '@tarojs/components';
import { analysisApi, schoolApi, authApi } from '../../api';
import { useAuthStore } from '../../stores/auth';

const FREE_LIMIT = 2;

export default function TeacherAnalysis() {
  const { user, setUser } = useAuthStore();
  const [reports, setReports] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [gradeNames, setGradeNames] = useState<string[]>([]);

  const [classGradeIdx, setClassGradeIdx] = useState(-1);
  const [classSubjectIdx, setClassSubjectIdx] = useState(-1);
  const [classExamIdx, setClassExamIdx] = useState(-1);
  const [studentIdx, setStudentIdx] = useState(-1);
  const [generatingClass, setGeneratingClass] = useState(false);
  const [generatingStudent, setGeneratingStudent] = useState(false);

  const classFree = Math.max(0, FREE_LIMIT - (user?.free_class_report_used || 0));
  const studentFree = Math.max(0, FREE_LIMIT - (user?.free_student_report_used || 0));
  const credits = user?.credits || 0;

  useEffect(() => {
    analysisApi.listStudents().then(setStudents);
    schoolApi.getMySubjects().then(setSubjects);
    analysisApi.listExams().then(setExams);
    analysisApi.listGradeNames().then(setGradeNames);
    analysisApi.listReports().then(setReports);
  }, []);

  const refreshUser = async () => { const r = await authApi.getMe(); setUser(r); };

  const checkCredits = (type: 'class' | 'student'): boolean => {
    const free = type === 'class' ? classFree : studentFree;
    if (free > 0 || credits > 0) return true;
    Taro.showModal({
      title: '次数不足', content: '免费次数已用完，是否充值10次？', confirmText: '充值',
    }).then(async r => {
      if (r.confirm) {
        const res = await authApi.recharge(10);
        setUser(res);
        Taro.showToast({ title: '充值成功', icon: 'success' });
      }
    });
    return false;
  };

  const handleClassReport = async () => {
    if (!checkCredits('class')) return;
    setGeneratingClass(true);
    try {
      const params: any = {};
      if (classGradeIdx >= 0) params.grade_name = gradeNames[classGradeIdx];
      if (classSubjectIdx >= 0) params.subject_id = subjects[classSubjectIdx]?.id;
      if (classExamIdx >= 0) params.exam_name = exams[classExamIdx]?.exam_name;
      const res = await analysisApi.generateClassReport(params);
      await refreshUser();
      analysisApi.listReports().then(setReports);
      Taro.showModal({ title: '班级报告', content: res.content?.replace(/[#*`|]/g, '').slice(0, 500), showCancel: false });
    } catch (err: any) {
      Taro.showToast({ title: err.detail || '生成失败', icon: 'none' });
    } finally {
      setGeneratingClass(false);
    }
  };

  const handleStudentReport = async () => {
    if (studentIdx < 0) { Taro.showToast({ title: '请选择学生', icon: 'none' }); return; }
    if (!checkCredits('student')) return;
    setGeneratingStudent(true);
    try {
      await analysisApi.generateReport({ student_id: students[studentIdx]?.id });
      Taro.showToast({ title: '报告已生成', icon: 'success' });
      await refreshUser();
      analysisApi.listReports().then(setReports);
    } catch (err: any) {
      Taro.showToast({ title: err.detail || '生成失败', icon: 'none' });
    } finally {
      setGeneratingStudent(false);
    }
  };

  return (
    <View className='container'>
      <Text className='title'>分析报告</Text>
      <View style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Text className='tag tag-green'>班级免费 {classFree}/{FREE_LIMIT}</Text>
        <Text className='tag tag-green'>学生免费 {studentFree}/{FREE_LIMIT}</Text>
        <Text className='tag tag-gold'>额度 {credits} 次</Text>
      </View>

      <View className='card'>
        <Text className='subtitle'>班级整体分析</Text>
        <Text className='text-secondary' style={{ display: 'block', marginBottom: '16px' }}>不选则默认分析全部</Text>
        <View style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <Picker mode='selector' range={['全部班级', ...gradeNames]} value={classGradeIdx + 1}
            onChange={e => setClassGradeIdx(Number(e.detail.value) - 1)}>
            <View className='btn-outline' style={{ padding: '8px 16px', fontSize: '22px' }}>
              {classGradeIdx >= 0 ? gradeNames[classGradeIdx] : '全部班级'}
            </View>
          </Picker>
          <Picker mode='selector' range={['全部科目', ...subjects.map((s: any) => s.name)]} value={classSubjectIdx + 1}
            onChange={e => setClassSubjectIdx(Number(e.detail.value) - 1)}>
            <View className='btn-outline' style={{ padding: '8px 16px', fontSize: '22px' }}>
              {classSubjectIdx >= 0 ? subjects[classSubjectIdx]?.name : '全部科目'}
            </View>
          </Picker>
          <Picker mode='selector' range={['全部考试', ...exams.map((e: any) => e.exam_name)]} value={classExamIdx + 1}
            onChange={e => setClassExamIdx(Number(e.detail.value) - 1)}>
            <View className='btn-outline' style={{ padding: '8px 16px', fontSize: '22px' }}>
              {classExamIdx >= 0 ? exams[classExamIdx]?.exam_name : '全部考试'}
            </View>
          </Picker>
        </View>
        <View className='btn-primary' style={{ opacity: generatingClass ? 0.6 : 1 }}
          onClick={!generatingClass ? handleClassReport : undefined}>
          {generatingClass ? '生成中...' : '生成班级报告'}
        </View>
      </View>

      <View className='card'>
        <Text className='subtitle'>学生个人分析</Text>
        <Picker mode='selector' range={['请选择学生', ...students.map((s: any) => `${s.real_name}(${s.student_no})`)]}
          value={studentIdx + 1} onChange={e => setStudentIdx(Number(e.detail.value) - 1)}>
          <View className='input-field' style={{ marginBottom: '16px' }}>
            {studentIdx >= 0 ? `${students[studentIdx]?.real_name}(${students[studentIdx]?.student_no})` : '请选择学生'}
          </View>
        </Picker>
        <View className='btn-primary' style={{ opacity: generatingStudent ? 0.6 : 1 }}
          onClick={!generatingStudent ? handleStudentReport : undefined}>
          {generatingStudent ? '生成中...' : '生成学生报告'}
        </View>
      </View>

      <Text className='subtitle' style={{ marginTop: '24px' }}>历史报告</Text>
      {reports.length > 0 ? reports.map((r: any) => (
        <View key={r.id} className='card' style={{ padding: '16px' }}
          onClick={() => Taro.showModal({ title: '报告', content: r.content?.replace(/[#*`|]/g, '').slice(0, 500), showCancel: false })}>
          <View style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text className={`tag ${r.report_type === 'class_analysis' ? 'tag-purple' : 'tag-blue'}`}>
              {r.report_type === 'class_analysis' ? '班级分析' : '学生分析'}
            </Text>
            <Text className='text-secondary'>{r.created_at?.slice(0, 10)}</Text>
          </View>
          <Text style={{ marginTop: '8px', fontSize: '24px', color: '#666' }}>
            {r.content?.replace(/[#*`|]/g, '').slice(0, 80)}...
          </Text>
        </View>
      )) : <Text className='empty-text'>暂无报告</Text>}
    </View>
  );
}

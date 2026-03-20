import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Picker } from '@tarojs/components';
import { gradeApi, schoolApi, analysisApi } from '../../api';
import { useAuthStore } from '../../stores/auth';

const ALL_SUBJECTS = 0;

function StudentUploadView() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [scores, setScores] = useState<Record<number, string>>({});
  const [totals, setTotals] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    schoolApi.getMySubjects().then((data: any[]) => {
      setSubjects(data);
      const defaultTotals: Record<number, string> = {};
      data.forEach((s: any) => { defaultTotals[s.id] = String(s.default_total_score || 100); });
      setTotals(defaultTotals);
    });
  }, []);

  const handleSubmit = async () => {
    if (!examName || !examDate) { Taro.showToast({ title: '请填写考试名称和日期', icon: 'none' }); return; }
    const items = subjects.filter(s => scores[s.id]?.trim()).map(s => ({
      subject_id: s.id, score: parseFloat(scores[s.id]),
      total_score: parseFloat(totals[s.id] || '100'),
    }));
    if (items.length === 0) { Taro.showToast({ title: '请至少填写一科成绩', icon: 'none' }); return; }
    setLoading(true);
    try {
      const res = await gradeApi.batchCreate({ exam_name: examName, exam_date: examDate, grades: items });
      Taro.showToast({ title: res.message || '上传成功', icon: 'success' });
      setScores({});
    } catch (err: any) { Taro.showToast({ title: err.detail || '上传失败', icon: 'none' }); }
    finally { setLoading(false); }
  };

  return (
    <View className='container'>
      <View className='card'>
        <Text className='subtitle'>考试信息</Text>
        <View className='input-item'><Text className='input-label'>考试名称</Text><Input className='input-field' placeholder='如：2024期中考试' value={examName} onInput={e => setExamName(e.detail.value)} /></View>
        <View className='input-item'><Text className='input-label'>考试日期</Text><Picker mode='date' value={examDate} onChange={e => setExamDate(e.detail.value)}><View className='input-field'>{examDate || '请选择日期'}</View></Picker></View>
      </View>
      <View className='card'>
        <Text className='subtitle'>各科成绩（留空不提交）</Text>
        <View style={{ display: 'flex', marginBottom: '12px', gap: '16px' }}>
          <Text style={{ width: '100px', fontSize: '22px', color: '#999' }}>科目</Text>
          <Text style={{ flex: 1, fontSize: '22px', color: '#999', textAlign: 'center' }}>成绩</Text>
          <Text style={{ width: '90px', fontSize: '22px', color: '#999', textAlign: 'center' }}>满分</Text>
        </View>
        {subjects.map(s => (
          <View key={s.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '14px', gap: '12px' }}>
            <Text style={{ width: '100px', fontWeight: 'bold', fontSize: '26px' }}>{s.name}</Text>
            <Input className='input-field' style={{ flex: 1, textAlign: 'center' }} type='digit' placeholder='成绩'
              value={scores[s.id] || ''} onInput={e => setScores({ ...scores, [s.id]: e.detail.value })} />
            <Input className='input-field' style={{ width: '90px', textAlign: 'center', color: '#999' }} type='digit'
              value={totals[s.id] || '100'} onInput={e => setTotals({ ...totals, [s.id]: e.detail.value })} />
          </View>
        ))}
      </View>
      <View className='btn-primary' style={{ opacity: loading ? 0.6 : 1 }} onClick={!loading ? handleSubmit : undefined}>{loading ? '提交中...' : '提交全部成绩'}</View>
    </View>
  );
}

function TeacherUploadView() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [gradeNames, setGradeNames] = useState<string[]>([]);
  const [gradeName, setGradeName] = useState('');
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [filePath, setFilePath] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { schoolApi.getMySubjects().then(setSubjects); analysisApi.listGradeNames().then(setGradeNames); }, []);

  const subjectOptions = ['全部科目（文件含subject列）', ...subjects.map(s => s.name)];
  const selectedSubjectId = subjectIdx === 0 ? ALL_SUBJECTS : subjects[subjectIdx - 1]?.id;
  const isAllSubjects = subjectIdx === 0;

  const handleChooseFile = () => {
    Taro.chooseMessageFile({ count: 1, type: 'file', extension: ['csv', 'xlsx', 'xls'] })
      .then(res => { if (res.tempFiles.length > 0) { setFilePath(res.tempFiles[0].path); setFileName(res.tempFiles[0].name); } })
      .catch(() => {});
  };

  const handleUpload = async () => {
    if (!gradeName) { Taro.showToast({ title: '请输入班级', icon: 'none' }); return; }
    if (!examName) { Taro.showToast({ title: '请输入考试名称', icon: 'none' }); return; }
    if (!examDate) { Taro.showToast({ title: '请选择日期', icon: 'none' }); return; }
    if (!filePath) { Taro.showToast({ title: '请选择文件', icon: 'none' }); return; }
    setLoading(true); setResult(null);
    try {
      const res = await gradeApi.batchUpload(filePath, examName, examDate, selectedSubjectId, gradeName);
      setResult(res); Taro.showToast({ title: res.message || '上传成功', icon: 'success', duration: 2000 });
      setFilePath(''); setFileName('');
    } catch (err: any) { Taro.showToast({ title: err.detail || '上传失败', icon: 'none' }); }
    finally { setLoading(false); }
  };

  return (
    <View className='container'>
      <View className='card'>
        <Text className='subtitle'>文件格式要求</Text>
        <Text className='text-secondary' style={{ display: 'block', lineHeight: '1.6' }}>
          上传 CSV/Excel，必须包含：{'\n'}• student_name（姓名）{'\n'}• student_no（学号）{'\n'}{isAllSubjects ? '• subject（科目）\n' : ''}• score（成绩）{'\n'}• total_score（满分，可选）
        </Text>
      </View>
      <View className='card'>
        <View className='input-item'>
          <Text className='input-label'>班级</Text>
          <Input className='input-field' placeholder='输入班级（如：高一1班）' value={gradeName} onInput={e => setGradeName(e.detail.value)} />
        </View>
        <View className='input-item'>
          <Text className='input-label'>科目</Text>
          <Picker mode='selector' range={subjectOptions} value={subjectIdx} onChange={e => setSubjectIdx(e.detail.value as number)}>
            <View className='input-field'>{subjectOptions[subjectIdx]}</View>
          </Picker>
        </View>
        <View className='input-item'><Text className='input-label'>考试名称</Text><Input className='input-field' placeholder='如：2024年期中考试' value={examName} onInput={e => setExamName(e.detail.value)} /></View>
        <View className='input-item'><Text className='input-label'>考试日期</Text><Picker mode='date' value={examDate} onChange={e => setExamDate(e.detail.value)}><View className='input-field'>{examDate || '请选择日期'}</View></Picker></View>
        <View className='input-item'>
          <Text className='input-label'>成绩文件</Text>
          <View className='input-field' onClick={handleChooseFile} style={{ color: fileName ? '#333' : '#999' }}>
            {fileName || '从微信聊天记录选择 CSV/Excel 文件'}
          </View>
          {fileName && <Text className='text-secondary' style={{ marginTop: '8px', display: 'block' }}>已选：{fileName}</Text>}
        </View>
      </View>
      <View className='btn-primary' style={{ opacity: loading ? 0.6 : 1 }} onClick={!loading ? handleUpload : undefined}>{loading ? '上传中...' : '上传并导入'}</View>
      {result && (
        <View className='card' style={{ marginTop: '16px' }}>
          <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>{result.message}</Text>
          {(result.errors || []).map((e: string, i: number) => (<Text key={i} style={{ color: '#faad14', display: 'block', marginTop: '8px', fontSize: '24px' }}>{e}</Text>))}
        </View>
      )}
    </View>
  );
}

export default function UploadPage() {
  const { user } = useAuthStore();
  return (
    <View>
      <Text className='title' style={{ padding: '24px 24px 0' }}>{user?.role === 'teacher' ? '批量上传成绩' : '成绩上传'}</Text>
      {user?.role === 'teacher' ? <TeacherUploadView /> : <StudentUploadView />}
    </View>
  );
}

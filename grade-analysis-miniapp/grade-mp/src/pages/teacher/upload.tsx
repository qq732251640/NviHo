import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Picker } from '@tarojs/components';
import { gradeApi, schoolApi, analysisApi } from '../../api';

const ALL_SUBJECTS = 0;

export default function TeacherUpload() {
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

  useEffect(() => {
    schoolApi.getMySubjects().then(setSubjects);
    analysisApi.listGradeNames().then(setGradeNames);
  }, []);

  const subjectOptions = ['全部科目（文件含subject列）', ...subjects.map((s: any) => s.name)];
  const selectedSubjectId = subjectIdx === 0 ? ALL_SUBJECTS : subjects[subjectIdx - 1]?.id;
  const isAllSubjects = subjectIdx === 0;

  const handleChooseFile = () => {
    Taro.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv', 'xlsx', 'xls'],
    }).then(res => {
      if (res.tempFiles.length > 0) {
        setFilePath(res.tempFiles[0].path);
        setFileName(res.tempFiles[0].name);
      }
    }).catch(() => {});
  };

  const handleUpload = async () => {
    if (!gradeName) { Taro.showToast({ title: '请输入班级', icon: 'none' }); return; }
    if (!examName) { Taro.showToast({ title: '请输入考试名称', icon: 'none' }); return; }
    if (!examDate) { Taro.showToast({ title: '请选择考试日期', icon: 'none' }); return; }
    if (!filePath) { Taro.showToast({ title: '请选择文件', icon: 'none' }); return; }

    setLoading(true);
    setResult(null);
    try {
      const res = await gradeApi.batchUpload(filePath, examName, examDate, selectedSubjectId, gradeName);
      setResult(res);
      Taro.showToast({ title: res.message || '上传成功', icon: 'success', duration: 2000 });
      setFilePath('');
      setFileName('');
    } catch (err: any) {
      Taro.showToast({ title: err.detail || '上传失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className='container'>
      <Text className='title'>批量上传成绩</Text>

      <View className='card'>
        <Text className='subtitle'>文件格式要求</Text>
        <Text className='text-secondary' style={{ display: 'block', lineHeight: '1.6', marginBottom: '8px' }}>
          上传 CSV 或 Excel 文件，必须包含列：{'\n'}
          • student_name（学生姓名）{'\n'}
          • student_no（学号）{'\n'}
          {isAllSubjects ? '• subject（科目名称）\n' : ''}
          • score（成绩）{'\n'}
          • total_score（满分，可选）{'\n'}
          {isAllSubjects ? '\n全部科目模式：每行一个学生一科成绩' : '\n单科模式：每行一个学生的该科成绩'}
        </Text>
      </View>

      <View className='card'>
        <View className='input-item'>
          <Text className='input-label'>班级</Text>
          <Input className='input-field' placeholder='输入班级（如：高一1班）' value={gradeName}
            onInput={e => setGradeName(e.detail.value)} />
        </View>

        <View className='input-item'>
          <Text className='input-label'>科目</Text>
          <Picker mode='selector' range={subjectOptions} value={subjectIdx}
            onChange={e => setSubjectIdx(e.detail.value as number)}>
            <View className='input-field'>{subjectOptions[subjectIdx]}</View>
          </Picker>
        </View>

        <View className='input-item'>
          <Text className='input-label'>考试名称</Text>
          <Input className='input-field' placeholder='如：2024年期中考试' value={examName}
            onInput={e => setExamName(e.detail.value)} />
        </View>

        <View className='input-item'>
          <Text className='input-label'>考试日期</Text>
          <Picker mode='date' value={examDate} onChange={e => setExamDate(e.detail.value)}>
            <View className='input-field'>{examDate || '请选择日期'}</View>
          </Picker>
        </View>

        <View className='input-item'>
          <Text className='input-label'>成绩文件</Text>
          <View className='input-field' onClick={handleChooseFile} style={{ color: fileName ? '#333' : '#999' }}>
            {fileName || '点击选择 CSV/Excel 文件'}
          </View>
        </View>
      </View>

      <View className='btn-primary' style={{ opacity: loading ? 0.6 : 1 }}
        onClick={!loading ? handleUpload : undefined}>
        {loading ? '上传中...' : '上传并导入'}
      </View>

      {result && (
        <View className='card' style={{ marginTop: '16px' }}>
          <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>{result.message}</Text>
          {(result.errors || []).map((e: string, i: number) => (
            <Text key={i} style={{ color: '#faad14', display: 'block', marginTop: '8px', fontSize: '24px' }}>{e}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

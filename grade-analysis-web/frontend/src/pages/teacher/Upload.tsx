import React, { useEffect, useState } from 'react';
import { Typography, Upload, Button, Form, Input, DatePicker, Select, Card, message, Alert, AutoComplete } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { gradeApi, schoolApi, analysisApi } from '../../api';
import type { Subject } from '../../types';

const ALL_SUBJECTS_VALUE = 0;

const TeacherUpload: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeNames, setGradeNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(ALL_SUBJECTS_VALUE);
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[]; message: string } | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    schoolApi.getMySubjects().then(res => setSubjects(res.data));
    analysisApi.listGradeNames().then(res => setGradeNames(res.data));
  }, []);

  const isAllSubjects = selectedSubjectId === ALL_SUBJECTS_VALUE;

  const handleDownloadTemplate = async () => {
    try {
      const res = await analysisApi.downloadTemplate(isAllSubjects ? 'all' : 'single');
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = isAllSubjects ? 'grade_upload_template_all.csv' : 'grade_upload_template_single.csv';
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('模板已下载');
    } catch {
      message.error('下载失败');
    }
  };

  const onFinish = async (values: any) => {
    const file = values.file?.[0]?.originFileObj;
    if (!file) {
      message.error('请选择文件');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await gradeApi.batchUpload(
        file,
        values.exam_name,
        values.exam_date.format('YYYY-MM-DD'),
        values.subject_id,
        values.grade_name,
      );
      setResult(res.data);
      message.success(res.data.message);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  const normFile = (e: any) => Array.isArray(e) ? e : e?.fileList;

  const subjectOptions = [
    { value: ALL_SUBJECTS_VALUE, label: '全部科目（文件含 subject 列）' },
    ...subjects.map(s => ({ value: s.id, label: s.name })),
  ];

  return (
    <div>
      <Typography.Title level={3}>批量上传成绩</Typography.Title>
      <Card style={{ maxWidth: 650 }}>
        <Alert
          message="文件格式要求"
          description={
            <div>
              <p style={{ marginBottom: 4 }}>上传 CSV 或 Excel 文件，必须包含以下列：</p>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                <li><strong>student_name</strong> — 学生姓名（必填）</li>
                <li><strong>student_no</strong> — 学号（必填）</li>
                {isAllSubjects && <li><strong>subject</strong> — 科目名称（必填，如：语文、数学）</li>}
                <li><strong>score</strong> — 成绩（必填）</li>
                <li><strong>total_score</strong> — 满分（可选，默认100）</li>
              </ul>
              <p style={{ margin: '4px 0', color: '#666', fontSize: 13 }}>
                {isAllSubjects
                  ? '全部科目模式：每行一个学生的一科成绩，同一学生多科请分多行填写。'
                  : '单科模式：文件中每行为一个学生的该科成绩。'}
                学号不存在时会自动创建学生账号。
              </p>
            </div>
          }
          type="info" showIcon style={{ marginBottom: 16 }}
          action={
            <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              下载模板
            </Button>
          }
        />

        <Form form={form} onFinish={onFinish} layout="vertical" size="large"
          initialValues={{ subject_id: ALL_SUBJECTS_VALUE }}>
          <Form.Item name="grade_name" label="班级" rules={[{ required: true, message: '请输入或选择班级' }]}>
            <AutoComplete
              placeholder="输入或选择班级（如：高一1班）"
              options={gradeNames.map(g => ({ value: g, label: g }))}
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="subject_id" label="科目" rules={[{ required: true, message: '请选择科目' }]}>
            <Select
              options={subjectOptions}
              onChange={(v) => setSelectedSubjectId(v)}
            />
          </Form.Item>
          <Form.Item name="exam_name" label="考试名称" rules={[{ required: true }]}>
            <Input placeholder="如：2024年期中考试" />
          </Form.Item>
          <Form.Item name="exam_date" label="考试日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="file" label="成绩文件" valuePropName="fileList" getValueFromEvent={normFile} rules={[{ required: true }]}>
            <Upload beforeUpload={() => false} maxCount={1} accept=".csv,.xlsx,.xls">
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>上传并导入</Button>
          </Form.Item>
        </Form>
        {result && (
          <div style={{ marginTop: 16 }}>
            <Alert message={result.message} type="success" showIcon />
            {(result.errors ?? []).map((e, i) => (
              <Alert key={i} message={e} type="warning" showIcon style={{ marginTop: 8 }} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TeacherUpload;

import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, DatePicker, Button, Typography, message, Card, Table, Space, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';
import { gradeApi, schoolApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import type { Subject } from '../../types';

interface ScoreRow {
  key: number;
  subject_id: number;
  subject_name: string;
  score: number | null;
  total_score: number;
}

const StudentUpload: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    schoolApi.getMySubjects().then(res => {
      const subjs = res.data;
      setSubjects(subjs);
      setScoreRows(subjs.map((s, i) => ({
        key: i,
        subject_id: s.id,
        subject_name: s.name,
        score: null,
        total_score: s.default_total_score || 100,
      })));
    });
  }, [user]);

  const updateRow = (key: number, field: 'score' | 'total_score', value: number | null) => {
    setScoreRows(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r));
  };

  const removeRow = (key: number) => {
    setScoreRows(prev => prev.filter(r => r.key !== key));
  };

  const addSubject = (subjectId: number) => {
    const subj = subjects.find(s => s.id === subjectId);
    if (!subj) return;
    if (scoreRows.some(r => r.subject_id === subjectId)) {
      message.warning('该科目已添加');
      return;
    }
    setScoreRows(prev => [...prev, {
      key: Date.now(),
      subject_id: subj.id,
      subject_name: subj.name,
      score: null,
      total_score: subj.default_total_score || 100,
    }]);
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    const values = form.getFieldsValue();
    const filledRows = scoreRows.filter(r => r.score !== null && r.score !== undefined);

    if (filledRows.length === 0) {
      message.warning('请至少填写一个科目的成绩');
      return;
    }

    setLoading(true);
    try {
      const res = await gradeApi.batchCreate({
        exam_name: values.exam_name,
        exam_date: values.exam_date.format('YYYY-MM-DD'),
        grades: filledRows.map(r => ({
          subject_id: r.subject_id,
          score: r.score!,
          total_score: r.total_score,
        })),
      });
      message.success(res.data.message || `成功上传 ${res.data.subjects?.length} 个科目`);
      setScoreRows(prev => prev.map(r => ({ ...r, score: null })));
      form.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '科目', dataIndex: 'subject_name', key: 'subject_name', width: 120,
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: '成绩', dataIndex: 'score', key: 'score', width: 150,
      render: (_: unknown, record: ScoreRow) => (
        <InputNumber
          min={0} max={record.total_score} style={{ width: '100%' }}
          placeholder="输入成绩"
          value={record.score}
          onChange={(v) => updateRow(record.key, 'score', v)}
        />
      ),
    },
    {
      title: '满分', dataIndex: 'total_score', key: 'total_score', width: 120,
      render: (_: unknown, record: ScoreRow) => (
        <InputNumber
          min={1} max={300} style={{ width: '100%' }}
          value={record.total_score}
          onChange={(v) => updateRow(record.key, 'total_score', v ?? 100)}
        />
      ),
    },
    {
      title: '', key: 'action', width: 50,
      render: (_: unknown, record: ScoreRow) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeRow(record.key)} />
      ),
    },
  ];

  const usedSubjectIds = new Set(scoreRows.map(r => r.subject_id));
  const availableSubjects = subjects.filter(s => !usedSubjectIds.has(s.id));

  return (
    <div>
      <Typography.Title level={3}>成绩上传</Typography.Title>
      <Card style={{ maxWidth: 700 }}>
        <Form form={form} layout="vertical" size="large">
          <Form.Item name="exam_name" label="考试名称" rules={[{ required: true, message: '请输入考试名称' }]}>
            <Input placeholder="如：2024年期中考试" />
          </Form.Item>
          <Form.Item name="exam_date" label="考试日期" rules={[{ required: true, message: '请选择考试日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>

        <Divider orientation="left">各科成绩（留空的科目不会提交）</Divider>

        <Table
          columns={columns}
          dataSource={scoreRows}
          rowKey="key"
          pagination={false}
          size="middle"
          footer={() => (
            <Space>
              {availableSubjects.length > 0 && (
                <>
                  <Typography.Text type="secondary">添加科目：</Typography.Text>
                  {availableSubjects.slice(0, 5).map(s => (
                    <Button key={s.id} size="small" icon={<PlusOutlined />} onClick={() => addSubject(s.id)}>
                      {s.name}
                    </Button>
                  ))}
                  {availableSubjects.length > 5 && (
                    <Typography.Text type="secondary">等 {availableSubjects.length} 个</Typography.Text>
                  )}
                </>
              )}
            </Space>
          )}
        />

        <Button
          type="primary" icon={<SendOutlined />} size="large"
          loading={loading} onClick={handleSubmit}
          style={{ marginTop: 16, width: '100%' }}
        >
          提交全部成绩
        </Button>
      </Card>
    </div>
  );
};

export default StudentUpload;

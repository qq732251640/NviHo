import React, { useEffect, useState } from 'react';
import { Typography, Select, Space, Table, Tag } from 'antd';
import { analysisApi, schoolApi } from '../../api';
import type { GradeRanking, Subject, ExamInfo } from '../../types';
import { useAuthStore } from '../../stores/authStore';

const StudentRanking: React.FC = () => {
  const [ranking, setRanking] = useState<GradeRanking[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [subjectId, setSubjectId] = useState<number>();
  const [examName, setExamName] = useState<string>();
  const [loading, setLoading] = useState(false);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    schoolApi.getMySubjects().then(res => {
      setSubjects(res.data);
      if (res.data.length > 0) setSubjectId(res.data[0].id);
    });
    analysisApi.listExams().then(res => {
      setExams(res.data);
      if (res.data.length > 0) setExamName(res.data[0].exam_name);
    });
  }, []);

  useEffect(() => {
    if (subjectId && examName) {
      setLoading(true);
      analysisApi.getRanking(subjectId, examName)
        .then(res => setRanking(res.data))
        .finally(() => setLoading(false));
    }
  }, [subjectId, examName]);

  const columns = [
    {
      title: '排名', dataIndex: 'rank', key: 'rank', width: 80,
      render: (rank: number) => {
        const colors: Record<number, string> = { 1: 'gold', 2: 'silver', 3: '#cd7f32' };
        return <Tag color={colors[rank] || undefined}>{rank}</Tag>;
      },
    },
    {
      title: '姓名', dataIndex: 'student_name', key: 'student_name',
      render: (name: string) => (
        <span style={{ fontWeight: name === user?.real_name ? 'bold' : 'normal', color: name === user?.real_name ? '#1890ff' : undefined }}>
          {name}{name === user?.real_name ? ' (我)' : ''}
        </span>
      ),
    },
    { title: '学号', dataIndex: 'student_no', key: 'student_no' },
    { title: '成绩', dataIndex: 'score', key: 'score', render: (s: number) => <strong>{s}</strong> },
  ];

  return (
    <div>
      <Typography.Title level={3}>成绩排名</Typography.Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="选择科目" style={{ width: 150 }} onChange={setSubjectId}
          options={subjects.map(s => ({ value: s.id, label: s.name }))} />
        <Select placeholder="选择考试" style={{ width: 200 }} onChange={setExamName}
          options={exams.map(e => ({ value: e.exam_name, label: e.exam_name }))} />
      </Space>
      {subjectId && examName ? (
        <Table columns={columns} dataSource={ranking} rowKey="rank" loading={loading} pagination={false}
          rowClassName={(record) => record.student_name === user?.real_name ? 'highlight-row' : ''} />
      ) : (
        <Typography.Text type="secondary">请选择科目和考试查看排名</Typography.Text>
      )}
    </div>
  );
};

export default StudentRanking;

import React, { useEffect, useState } from 'react';
import { Typography, Select, Spin, Space, Table } from 'antd';
import ReactECharts from 'echarts-for-react';
import { analysisApi } from '../../api';
import type { SubjectComparison, ExamInfo, StudentInfo } from '../../types';

const TeacherComparison: React.FC = () => {
  const [comparison, setComparison] = useState<SubjectComparison[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [examName, setExamName] = useState<string>();
  const [studentId, setStudentId] = useState<number>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    analysisApi.listExams().then(res => setExams(res.data));
    analysisApi.listStudents().then(res => setStudents(res.data));
  }, []);

  useEffect(() => {
    if (examName && studentId) {
      setLoading(true);
      analysisApi.getComparison(examName, studentId)
        .then(res => setComparison(res.data))
        .finally(() => setLoading(false));
    }
  }, [examName, studentId]);

  const radarOption = {
    tooltip: {},
    legend: { data: ['学生成绩', '班级平均'] },
    radar: { indicator: comparison.map(c => ({ name: c.subject_name, max: 100 })) },
    series: [{
      type: 'radar' as const,
      data: [
        { value: comparison.map(c => c.score), name: '学生成绩', areaStyle: { opacity: 0.2 } },
        { value: comparison.map(c => c.average), name: '班级平均', areaStyle: { opacity: 0.2 } },
      ],
    }],
  };

  const barOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['学生成绩', '班级平均'] },
    xAxis: { type: 'category' as const, data: comparison.map(c => c.subject_name) },
    yAxis: { type: 'value' as const, min: 0 },
    series: [
      { name: '学生成绩', type: 'bar' as const, data: comparison.map(c => c.score) },
      { name: '班级平均', type: 'bar' as const, data: comparison.map(c => c.average) },
    ],
  };

  const columns = [
    { title: '科目', dataIndex: 'subject_name', key: 'subject_name' },
    { title: '学生成绩', dataIndex: 'score', key: 'score' },
    { title: '班级平均', dataIndex: 'average', key: 'average' },
    {
      title: '差值', key: 'diff',
      render: (_: unknown, r: SubjectComparison) => {
        const diff = r.score - r.average;
        return <span style={{ color: diff >= 0 ? '#52c41a' : '#ff4d4f' }}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}</span>;
      },
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>成绩对比</Typography.Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="选择学生" style={{ width: 180 }} onChange={setStudentId} showSearch
          filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          options={students.map(s => ({ value: s.id, label: s.real_name }))} />
        <Select placeholder="选择考试" style={{ width: 200 }} onChange={setExamName}
          options={exams.map(e => ({ value: e.exam_name, label: e.exam_name }))} />
      </Space>
      <Spin spinning={loading}>
        {comparison.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              <div style={{ flex: 1, minWidth: 350 }}><ReactECharts option={radarOption} style={{ height: 400 }} /></div>
              <div style={{ flex: 1, minWidth: 350 }}><ReactECharts option={barOption} style={{ height: 400 }} /></div>
            </div>
            <Table columns={columns} dataSource={comparison} rowKey="subject_name" pagination={false} size="small" />
          </>
        ) : (
          <Typography.Text type="secondary">{examName && studentId ? '暂无数据' : '请选择学生和考试'}</Typography.Text>
        )}
      </Spin>
    </div>
  );
};

export default TeacherComparison;

import React, { useEffect, useState } from 'react';
import { Typography, Select, Space, Spin, Table } from 'antd';
import ReactECharts from 'echarts-for-react';
import { analysisApi, schoolApi } from '../../api';
import type { GradeDistribution, Subject, ExamInfo } from '../../types';

const TeacherDistribution: React.FC = () => {
  const [distribution, setDistribution] = useState<GradeDistribution[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [subjectId, setSubjectId] = useState<number>();
  const [examName, setExamName] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    schoolApi.getMySubjects().then(res => setSubjects(res.data));
    analysisApi.listExams().then(res => setExams(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    analysisApi.getDistribution({ subject_id: subjectId, exam_name: examName })
      .then(res => setDistribution(res.data))
      .finally(() => setLoading(false));
  }, [subjectId, examName]);

  const barOption = {
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: distribution.map(d => d.range_label) },
    yAxis: { type: 'value' as const, name: '人数' },
    series: [{
      type: 'bar' as const,
      data: distribution.map(d => d.count),
      itemStyle: {
        color: (params: any) => {
          const colors = ['#ff4d4f', '#faad14', '#52c41a', '#1890ff', '#722ed1'];
          return colors[params.dataIndex] || '#1890ff';
        },
      },
      label: { show: true, position: 'top' as const, formatter: '{c}人' },
    }],
  };

  const pieOption = {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c}人 ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie' as const, radius: ['40%', '70%'],
      data: distribution.map(d => ({ name: d.range_label, value: d.count })),
    }],
  };

  const columns = [
    { title: '分数段', dataIndex: 'range_label', key: 'range_label' },
    { title: '人数', dataIndex: 'count', key: 'count' },
    { title: '占比', dataIndex: 'percentage', key: 'percentage', render: (v: number) => `${v}%` },
  ];

  return (
    <div>
      <Typography.Title level={3}>成绩分布</Typography.Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select allowClear placeholder="筛选科目" style={{ width: 150 }} onChange={setSubjectId}
          options={subjects.map(s => ({ value: s.id, label: s.name }))} />
        <Select allowClear placeholder="筛选考试" style={{ width: 200 }} onChange={setExamName}
          options={exams.map(e => ({ value: e.exam_name, label: e.exam_name }))} />
      </Space>
      <Spin spinning={loading}>
        {distribution.some(d => d.count > 0) ? (
          <>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              <div style={{ flex: 1, minWidth: 300 }}><ReactECharts option={barOption} style={{ height: 350 }} /></div>
              <div style={{ flex: 1, minWidth: 300 }}><ReactECharts option={pieOption} style={{ height: 350 }} /></div>
            </div>
            <Table columns={columns} dataSource={distribution} rowKey="range_label" pagination={false} size="small" />
          </>
        ) : (
          <Typography.Text type="secondary">暂无分布数据</Typography.Text>
        )}
      </Spin>
    </div>
  );
};

export default TeacherDistribution;

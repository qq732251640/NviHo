import React, { useEffect, useState } from 'react';
import { Typography, Select, Spin, Table } from 'antd';
import ReactECharts from 'echarts-for-react';
import { analysisApi } from '../../api';
import type { SubjectComparison, ExamInfo } from '../../types';

const StudentComparison: React.FC = () => {
  const [comparison, setComparison] = useState<SubjectComparison[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [examName, setExamName] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    analysisApi.listExams().then(res => setExams(res.data));
  }, []);

  useEffect(() => {
    if (examName) {
      setLoading(true);
      analysisApi.getComparison(examName)
        .then(res => setComparison(res.data))
        .finally(() => setLoading(false));
    }
  }, [examName]);

  const radarOption = {
    tooltip: {},
    legend: { data: ['我的成绩', '班级平均'] },
    radar: {
      indicator: comparison.map(c => ({ name: c.subject_name, max: 100 })),
    },
    series: [{
      type: 'radar' as const,
      data: [
        { value: comparison.map(c => c.score), name: '我的成绩', areaStyle: { opacity: 0.2 } },
        { value: comparison.map(c => c.average), name: '班级平均', areaStyle: { opacity: 0.2 } },
      ],
    }],
  };

  const barOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['我的成绩', '班级平均'] },
    xAxis: { type: 'category' as const, data: comparison.map(c => c.subject_name) },
    yAxis: { type: 'value' as const, min: 0 },
    series: [
      { name: '我的成绩', type: 'bar' as const, data: comparison.map(c => c.score) },
      { name: '班级平均', type: 'bar' as const, data: comparison.map(c => c.average) },
    ],
  };

  const columns = [
    { title: '科目', dataIndex: 'subject_name', key: 'subject_name' },
    { title: '我的成绩', dataIndex: 'score', key: 'score' },
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
      <Select placeholder="选择考试" style={{ width: 200, marginBottom: 16 }} onChange={setExamName}
        options={exams.map(e => ({ value: e.exam_name, label: e.exam_name }))} />
      <Spin spinning={loading}>
        {comparison.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              <div style={{ flex: 1, minWidth: 350 }}>
                <ReactECharts option={radarOption} style={{ height: 400 }} />
              </div>
              <div style={{ flex: 1, minWidth: 350 }}>
                <ReactECharts option={barOption} style={{ height: 400 }} />
              </div>
            </div>
            <Table columns={columns} dataSource={comparison} rowKey="subject_name" pagination={false} size="small" />
          </>
        ) : (
          <Typography.Text type="secondary">{examName ? '暂无对比数据' : '请选择考试查看对比'}</Typography.Text>
        )}
      </Spin>
    </div>
  );
};

export default StudentComparison;

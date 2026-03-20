import React, { useEffect, useState } from 'react';
import { Typography, Select, Spin, Table } from 'antd';
import ReactECharts from 'echarts-for-react';
import { analysisApi, schoolApi } from '../../api';
import type { GradeTrend, Subject } from '../../types';

const StudentTrends: React.FC = () => {
  const [trends, setTrends] = useState<GradeTrend[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    schoolApi.getMySubjects().then(res => setSubjects(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    analysisApi.getTrends({ subject_id: subjectId })
      .then(res => setTrends(res.data))
      .finally(() => setLoading(false));
  }, [subjectId]);

  const trendsBySubject: Record<string, GradeTrend[]> = {};
  trends.forEach(t => {
    const subj = t.subject_name || '未知';
    if (!trendsBySubject[subj]) trendsBySubject[subj] = [];
    trendsBySubject[subj].push(t);
  });

  const examNames = [...new Set(trends.map(t => t.exam_name))];

  const option = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: Object.keys(trendsBySubject) },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category' as const, data: examNames, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' as const, min: 0 },
    series: Object.entries(trendsBySubject).map(([name, data]) => ({
      name, type: 'line' as const, smooth: true,
      data: examNames.map(en => data.find(d => d.exam_name === en)?.score ?? null),
      connectNulls: true,
    })),
  };

  const columns = [
    { title: '考试名称', dataIndex: 'exam_name', key: 'exam_name' },
    { title: '科目', dataIndex: 'subject_name', key: 'subject_name' },
    { title: '成绩', dataIndex: 'score', key: 'score' },
    { title: '日期', dataIndex: 'exam_date', key: 'exam_date' },
  ];

  return (
    <div>
      <Typography.Title level={3}>成绩趋势</Typography.Title>
      <Select allowClear placeholder="筛选科目" style={{ width: 150, marginBottom: 16 }}
        onChange={setSubjectId} options={subjects.map(s => ({ value: s.id, label: s.name }))} />
      <Spin spinning={loading}>
        {trends.length > 0 ? (
          <>
            <ReactECharts option={option} style={{ height: 400, marginBottom: 24 }} />
            <Table columns={columns} dataSource={trends} rowKey={(_, i) => String(i)} pagination={false} size="small" />
          </>
        ) : (
          <Typography.Text type="secondary">暂无成绩趋势数据</Typography.Text>
        )}
      </Spin>
    </div>
  );
};

export default StudentTrends;

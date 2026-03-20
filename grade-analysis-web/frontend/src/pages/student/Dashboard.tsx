import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin } from 'antd';
import { TrophyOutlined, BookOutlined, RiseOutlined, BarChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { analysisApi, gradeApi } from '../../api';
import type { GradeStats, Grade, GradeTrend } from '../../types';

const StudentDashboard: React.FC = () => {
  const [stats, setStats] = useState<GradeStats | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [trends, setTrends] = useState<GradeTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analysisApi.getStats(),
      gradeApi.getMyGrades(),
      analysisApi.getTrends(),
    ]).then(([statsRes, gradesRes, trendsRes]) => {
      setStats(statsRes.data);
      setGrades(gradesRes.data);
      setTrends(trendsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const recentGrades = grades.slice(0, 5);

  const trendsBySubject: Record<string, GradeTrend[]> = {};
  trends.forEach(t => {
    const subj = t.subject_name || '未知';
    if (!trendsBySubject[subj]) trendsBySubject[subj] = [];
    trendsBySubject[subj].push(t);
  });

  const trendOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: Object.keys(trendsBySubject) },
    xAxis: {
      type: 'category' as const,
      data: [...new Set(trends.map(t => t.exam_name))],
    },
    yAxis: { type: 'value' as const, min: 0, max: 100 },
    series: Object.entries(trendsBySubject).map(([name, data]) => ({
      name,
      type: 'line' as const,
      smooth: true,
      data: data.map(d => d.score),
    })),
  };

  return (
    <div>
      <Typography.Title level={3}>学生首页</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="平均分" value={stats?.average ?? '-'} prefix={<BarChartOutlined />} precision={1} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="最高分" value={stats?.highest ?? '-'} prefix={<TrophyOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="最低分" value={stats?.lowest ?? '-'} prefix={<RiseOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="考试次数" value={stats?.count ?? 0} prefix={<BookOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card title="成绩趋势">
            {trends.length > 0 ? (
              <ReactECharts option={trendOption} style={{ height: 300 }} />
            ) : (
              <Typography.Text type="secondary">暂无成绩数据</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="最近成绩">
            {recentGrades.length > 0 ? recentGrades.map(g => (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span>{g.subject_name} - {g.exam_name}</span>
                <span style={{ fontWeight: 'bold', color: g.score >= 60 ? '#52c41a' : '#ff4d4f' }}>{g.score}</span>
              </div>
            )) : <Typography.Text type="secondary">暂无成绩</Typography.Text>}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentDashboard;

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin } from 'antd';
import { TeamOutlined, TrophyOutlined, BarChartOutlined, BookOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { analysisApi } from '../../api';
import type { GradeStats, GradeDistribution, StudentInfo } from '../../types';

const TeacherDashboard: React.FC = () => {
  const [stats, setStats] = useState<GradeStats | null>(null);
  const [distribution, setDistribution] = useState<GradeDistribution[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analysisApi.getStats(),
      analysisApi.getDistribution(),
      analysisApi.listStudents(),
    ]).then(([statsRes, distRes, studentsRes]) => {
      setStats(statsRes.data);
      setDistribution(distRes.data);
      setStudents(studentsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const distOption = {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c}人 ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie' as const, radius: ['40%', '70%'],
      data: distribution.map(d => ({ name: d.range_label, value: d.count })),
      label: { formatter: '{b}\n{d}%' },
    }],
  };

  return (
    <div>
      <Typography.Title level={3}>教师首页</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="学生人数" value={students.length} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="平均分" value={stats?.average ?? '-'} prefix={<BarChartOutlined />} precision={1} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="最高分" value={stats?.highest ?? '-'} prefix={<TrophyOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="考试记录" value={stats?.count ?? 0} prefix={<BookOutlined />} /></Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="成绩分布">
            {distribution.some(d => d.count > 0) ? (
              <ReactECharts option={distOption} style={{ height: 350 }} />
            ) : <Typography.Text type="secondary">暂无数据</Typography.Text>}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="学生列表" extra={<span>共 {students.length} 人</span>}>
            <div style={{ maxHeight: 350, overflow: 'auto' }}>
              {students.map(s => (
                <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{s.real_name}</span>
                  <span style={{ color: '#999' }}>{s.student_no} | {s.grade_name}</span>
                </div>
              ))}
              {students.length === 0 && <Typography.Text type="secondary">暂无学生数据</Typography.Text>}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherDashboard;

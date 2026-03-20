import React, { useEffect, useState } from 'react';
import { Typography, Select, Spin, Card, Row, Col, Statistic, Table } from 'antd';
import { TrophyOutlined, WarningOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { gradeApi, analysisApi } from '../../api';
import type { Grade, ExamInfo } from '../../types';

interface RateItem {
  subject_name: string;
  score: number;
  total_score: number;
  rate: number;
  gap: number;
}

const StudentComparison: React.FC = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [examName, setExamName] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    analysisApi.listExams().then(res => {
      setExams(res.data);
      if (res.data.length > 0) setExamName(res.data[0].exam_name);
    });
  }, []);

  useEffect(() => {
    if (examName) {
      setLoading(true);
      gradeApi.list({ exam_name: examName })
        .then(res => setGrades(res.data))
        .finally(() => setLoading(false));
    }
  }, [examName]);

  const rateItems: RateItem[] = grades.map(g => ({
    subject_name: g.subject_name || '未知',
    score: g.score,
    total_score: g.total_score,
    rate: g.total_score > 0 ? Math.round((g.score / g.total_score) * 1000) / 10 : 0,
    gap: g.total_score - g.score,
  }));

  const avgRate = rateItems.length > 0 ? rateItems.reduce((s, r) => s + r.rate, 0) / rateItems.length : 0;
  const strongest = [...rateItems].sort((a, b) => b.rate - a.rate)[0];
  const weakest = [...rateItems].sort((a, b) => a.rate - b.rate)[0];

  const radarOption = rateItems.length > 0 ? {
    tooltip: {},
    radar: {
      indicator: rateItems.map(r => ({ name: `${r.subject_name}\n${r.rate}%`, max: 100 })),
      shape: 'polygon' as const,
      splitNumber: 5,
      axisName: { color: '#333', fontSize: 12 },
    },
    series: [{
      type: 'radar' as const,
      data: [{
        value: rateItems.map(r => r.rate),
        name: '得分率',
        areaStyle: { color: 'rgba(91, 33, 182, 0.2)' },
        lineStyle: { color: '#5b21b6', width: 2 },
        itemStyle: { color: '#5b21b6' },
      }],
    }],
  } : {};

  const barOption = rateItems.length > 0 ? {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = params[0];
        const item = rateItems[p.dataIndex];
        return `${item.subject_name}<br/>得分: ${item.score}/${item.total_score}<br/>得分率: ${item.rate}%<br/>差满分: ${item.gap}分`;
      },
    },
    xAxis: { type: 'category' as const, data: rateItems.map(r => r.subject_name), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' as const, min: 0, max: 100, name: '得分率%' },
    series: [{
      type: 'bar' as const,
      data: rateItems.map(r => ({
        value: r.rate,
        itemStyle: {
          color: r.rate >= 90 ? '#52c41a' : r.rate >= 80 ? '#1890ff' : r.rate >= 70 ? '#faad14' : r.rate >= 60 ? '#fa8c16' : '#ff4d4f',
        },
      })),
      label: { show: true, position: 'top' as const, formatter: '{c}%', fontSize: 11 },
    }],
  } : {};

  const columns = [
    { title: '科目', dataIndex: 'subject_name', key: 'subject_name', render: (v: string) => <strong>{v}</strong> },
    { title: '成绩', key: 'score', render: (_: unknown, r: RateItem) => `${r.score}/${r.total_score}` },
    {
      title: '得分率', dataIndex: 'rate', key: 'rate',
      render: (v: number) => <span style={{ color: v >= 90 ? '#52c41a' : v >= 80 ? '#1890ff' : v >= 70 ? '#faad14' : '#ff4d4f', fontWeight: 'bold' }}>{v}%</span>,
      sorter: (a: RateItem, b: RateItem) => a.rate - b.rate,
    },
    {
      title: '满分差距', dataIndex: 'gap', key: 'gap',
      render: (v: number) => <span style={{ color: v <= 10 ? '#52c41a' : v <= 20 ? '#faad14' : '#ff4d4f' }}>差 {v} 分</span>,
      sorter: (a: RateItem, b: RateItem) => b.gap - a.gap,
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>成绩对比</Typography.Title>
      <Select value={examName} onChange={setExamName} style={{ width: 250, marginBottom: 16 }}
        placeholder="选择考试" options={exams.map(e => ({ value: e.exam_name, label: e.exam_name }))} />

      <Spin spinning={loading}>
        {rateItems.length > 0 ? (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={8}>
                <Card size="small">
                  <Statistic title="平均得分率" value={avgRate.toFixed(1)} suffix="%" valueStyle={{ color: '#5b21b6' }} />
                </Card>
              </Col>
              <Col xs={8}>
                <Card size="small">
                  <Statistic title={<><TrophyOutlined style={{ color: '#52c41a' }} /> 最强</>}
                    value={strongest?.subject_name} suffix={<span style={{ fontSize: 13 }}>{strongest?.rate}%</span>}
                    valueStyle={{ fontSize: 18, color: '#52c41a' }} />
                </Card>
              </Col>
              <Col xs={8}>
                <Card size="small">
                  <Statistic title={<><WarningOutlined style={{ color: '#ff4d4f' }} /> 最弱</>}
                    value={weakest?.subject_name} suffix={<span style={{ fontSize: 13 }}>{weakest?.rate}%</span>}
                    valueStyle={{ fontSize: 18, color: '#ff4d4f' }} />
                </Card>
              </Col>
            </Row>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              <div style={{ flex: 1, minWidth: 350 }}>
                <Card title="科目雷达图" size="small">
                  <ReactECharts option={radarOption} style={{ height: 380 }} />
                </Card>
              </div>
              <div style={{ flex: 1, minWidth: 350 }}>
                <Card title="得分率柱状图" size="small">
                  <ReactECharts option={barOption} style={{ height: 380 }} />
                </Card>
              </div>
            </div>

            <Card title="满分差距" size="small">
              <Table columns={columns} dataSource={rateItems} rowKey="subject_name" pagination={false} size="small" />
            </Card>
          </>
        ) : (
          <Typography.Text type="secondary">{examName ? '暂无数据' : '请选择考试'}</Typography.Text>
        )}
      </Spin>
    </div>
  );
};

export default StudentComparison;

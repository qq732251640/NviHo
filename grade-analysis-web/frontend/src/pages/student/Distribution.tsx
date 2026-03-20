import React, { useEffect, useState } from 'react';
import { Typography, Select, Spin, Tag, Card, Row, Col, Empty } from 'antd';
import ReactECharts from 'echarts-for-react';
import { analysisApi } from '../../api';
import type { StudentGradeDistribution, ExamInfo } from '../../types';

const RANGE_COLORS: Record<string, string> = {
  '0-59 不及格': '#ff4d4f',
  '60-69 及格': '#faad14',
  '70-79 中等': '#52c41a',
  '80-89 良好': '#1890ff',
  '90-100 优秀': '#722ed1',
};

const StudentDistribution: React.FC = () => {
  const [distribution, setDistribution] = useState<StudentGradeDistribution[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [examName, setExamName] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    analysisApi.listExams().then(res => setExams(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    analysisApi.getMyDistribution(examName)
      .then(res => setDistribution(res.data))
      .finally(() => setLoading(false));
  }, [examName]);

  const hasData = distribution.some(d => d.count > 0);

  const barOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = params[0];
        const item = distribution[p.dataIndex];
        if (!item || item.count === 0) return `${p.name}: 0 科`;
        return `${p.name}<br/>共 ${item.count} 科<br/>${item.subjects.join('<br/>')}`;
      },
    },
    xAxis: {
      type: 'category' as const,
      data: distribution.map(d => d.range_label),
      axisLabel: { rotate: 15 },
    },
    yAxis: { type: 'value' as const, name: '科目数', minInterval: 1 },
    series: [{
      type: 'bar' as const,
      data: distribution.map((d, i) => ({
        value: d.count,
        itemStyle: { color: Object.values(RANGE_COLORS)[i] },
      })),
      label: { show: true, position: 'top' as const, formatter: '{c}科' },
    }],
  };

  const pieOption = {
    tooltip: {
      trigger: 'item' as const,
      formatter: (params: any) => {
        const item = distribution.find(d => d.range_label === params.name);
        if (!item || item.count === 0) return `${params.name}: 0 科`;
        return `${params.name}<br/>共 ${item.count} 科<br/>${item.subjects.join('<br/>')}`;
      },
    },
    legend: { bottom: 0 },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      data: distribution.filter(d => d.count > 0).map(d => ({
        name: d.range_label, value: d.count,
        itemStyle: { color: RANGE_COLORS[d.range_label] },
      })),
    }],
  };

  return (
    <div>
      <Typography.Title level={3}>我的成绩分布</Typography.Title>
      <Select
        allowClear placeholder="筛选考试（默认全部）" style={{ width: 250, marginBottom: 16 }}
        onChange={setExamName}
        options={exams.map(e => ({ value: e.exam_name, label: e.exam_name }))}
      />
      <Spin spinning={loading}>
        {hasData ? (
          <>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              <div style={{ flex: 1, minWidth: 300 }}>
                <ReactECharts option={barOption} style={{ height: 350 }} />
              </div>
              <div style={{ flex: 1, minWidth: 300 }}>
                <ReactECharts option={pieOption} style={{ height: 350 }} />
              </div>
            </div>
            <Row gutter={[12, 12]}>
              {distribution.map(d => (
                <Col xs={24} sm={12} md={8} key={d.range_label}>
                  <Card
                    size="small"
                    title={<span style={{ color: RANGE_COLORS[d.range_label] }}>{d.range_label}</span>}
                    extra={<Tag color={RANGE_COLORS[d.range_label]}>{d.count}科</Tag>}
                  >
                    {d.subjects.length > 0 ? (
                      d.subjects.map((s, i) => (
                        <Tag key={i} style={{ marginBottom: 4 }}>{s}</Tag>
                      ))
                    ) : (
                      <Typography.Text type="secondary">无</Typography.Text>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        ) : (
          <Empty description="暂无成绩分布数据" />
        )}
      </Spin>
    </div>
  );
};

export default StudentDistribution;

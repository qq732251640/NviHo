import React, { useEffect, useState } from 'react';
import { Typography, Select, Card, Row, Col, Statistic, Progress, Space } from 'antd';
import { TrophyOutlined, WarningOutlined } from '@ant-design/icons';
import { gradeApi, analysisApi } from '../../api';
import type { Grade, ExamInfo } from '../../types';

interface RateItem {
  subject_name: string;
  score: number;
  total_score: number;
  rate: number;
}

const rateColor = (rate: number) => {
  if (rate >= 90) return '#52c41a';
  if (rate >= 80) return '#1890ff';
  if (rate >= 70) return '#faad14';
  if (rate >= 60) return '#fa8c16';
  return '#ff4d4f';
};

const rateLabel = (rate: number) => {
  if (rate >= 90) return '优秀';
  if (rate >= 80) return '良好';
  if (rate >= 70) return '中等';
  if (rate >= 60) return '及格';
  return '不及格';
};

const StudentRanking: React.FC = () => {
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

  const rateItems: RateItem[] = grades
    .map(g => ({
      subject_name: g.subject_name || '未知',
      score: g.score,
      total_score: g.total_score,
      rate: g.total_score > 0 ? Math.round((g.score / g.total_score) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  const strongest = rateItems[0];
  const weakest = rateItems[rateItems.length - 1];
  const avgRate = rateItems.length > 0 ? (rateItems.reduce((s, r) => s + r.rate, 0) / rateItems.length) : 0;

  return (
    <div>
      <Typography.Title level={3}>得分率排名</Typography.Title>

      <Select
        value={examName} onChange={setExamName}
        style={{ width: 250, marginBottom: 24 }}
        placeholder="选择考试"
        options={exams.map(e => ({ value: e.exam_name, label: e.exam_name }))}
      />

      {rateItems.length > 0 && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={8}>
              <Card size="small">
                <Statistic title="综合得分率" value={avgRate.toFixed(1)} suffix="%" valueStyle={{ color: rateColor(avgRate) }} />
              </Card>
            </Col>
            <Col xs={8}>
              <Card size="small">
                <Statistic title={<><TrophyOutlined style={{ color: '#52c41a' }} /> 最强科</>}
                  value={strongest?.subject_name} suffix={<span style={{ fontSize: 14 }}>{strongest?.rate}%</span>}
                  valueStyle={{ fontSize: 20, color: '#52c41a' }} />
              </Card>
            </Col>
            <Col xs={8}>
              <Card size="small">
                <Statistic title={<><WarningOutlined style={{ color: '#ff4d4f' }} /> 最弱科</>}
                  value={weakest?.subject_name} suffix={<span style={{ fontSize: 14 }}>{weakest?.rate}%</span>}
                  valueStyle={{ fontSize: 20, color: '#ff4d4f' }} />
              </Card>
            </Col>
          </Row>

          <Card loading={loading}>
            {rateItems.map((item, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Space>
                    <Typography.Text strong style={{ fontSize: 16 }}>{item.subject_name}</Typography.Text>
                    <Typography.Text type="secondary">{item.score}/{item.total_score}</Typography.Text>
                  </Space>
                  <Typography.Text strong style={{ fontSize: 16, color: rateColor(item.rate) }}>
                    {item.rate}% {rateLabel(item.rate)}
                  </Typography.Text>
                </div>
                <Progress
                  percent={item.rate}
                  strokeColor={rateColor(item.rate)}
                  showInfo={false}
                  size="small"
                />
              </div>
            ))}
          </Card>

          <Card size="small" style={{ marginTop: 16 }}>
            <Space wrap>
              <Typography.Text><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#52c41a', marginRight: 4 }} />90%+ 优秀</Typography.Text>
              <Typography.Text><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#1890ff', marginRight: 4 }} />80%+ 良好</Typography.Text>
              <Typography.Text><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#faad14', marginRight: 4 }} />70%+ 中等</Typography.Text>
              <Typography.Text><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#fa8c16', marginRight: 4 }} />60%+ 及格</Typography.Text>
              <Typography.Text><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#ff4d4f', marginRight: 4 }} />&lt;60% 不及格</Typography.Text>
            </Space>
          </Card>
        </>
      )}

      {!loading && rateItems.length === 0 && examName && (
        <Typography.Text type="secondary">该考试暂无成绩数据</Typography.Text>
      )}
    </div>
  );
};

export default StudentRanking;

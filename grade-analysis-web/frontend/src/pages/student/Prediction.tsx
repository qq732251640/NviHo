import React, { useEffect, useState } from 'react';
import { Typography, Spin, Card, Row, Col, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { analysisApi } from '../../api';
import type { GradePrediction } from '../../types';

const StudentPrediction: React.FC = () => {
  const [predictions, setPredictions] = useState<GradePrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysisApi.getPrediction()
      .then(res => setPredictions(res.data))
      .finally(() => setLoading(false));
  }, []);

  const getChartOption = (p: GradePrediction) => {
    const allDates = [...p.exam_dates, '预测'];
    const allScores = [...p.historical_scores, null];
    const predLine = new Array(p.historical_scores.length - 1).fill(null);
    predLine.push(p.historical_scores[p.historical_scores.length - 1]);
    predLine.push(p.predicted_score);

    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['历史成绩', '预测'] },
      xAxis: { type: 'category' as const, data: allDates },
      yAxis: { type: 'value' as const, min: 0 },
      series: [
        { name: '历史成绩', type: 'line' as const, data: allScores, smooth: true },
        {
          name: '预测', type: 'line' as const, data: predLine, smooth: true,
          lineStyle: { type: 'dashed' as const },
          itemStyle: { color: '#ff7a45' },
        },
      ],
    };
  };

  return (
    <div>
      <Typography.Title level={3}>成绩预测</Typography.Title>
      <Spin spinning={loading}>
        {predictions.length > 0 ? (
          <Row gutter={[16, 16]}>
            {predictions.map(p => {
              const lastScore = p.historical_scores[p.historical_scores.length - 1];
              const diff = p.predicted_score - lastScore;
              return (
                <Col xs={24} lg={12} key={p.subject_name}>
                  <Card title={p.subject_name}>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={12}>
                        <Statistic title="预测下次成绩" value={p.predicted_score} precision={1}
                          valueStyle={{ color: diff >= 0 ? '#3f8600' : '#cf1322' }}
                          prefix={diff >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} />
                      </Col>
                      <Col span={12}>
                        <Statistic title="最近成绩" value={lastScore} />
                      </Col>
                    </Row>
                    <ReactECharts option={getChartOption(p)} style={{ height: 250 }} />
                  </Card>
                </Col>
              );
            })}
          </Row>
        ) : (
          <Typography.Text type="secondary">需要至少两次考试成绩才能进行预测</Typography.Text>
        )}
      </Spin>
    </div>
  );
};

export default StudentPrediction;

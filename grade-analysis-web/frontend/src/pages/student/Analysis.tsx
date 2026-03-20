import React, { useEffect, useState } from 'react';
import { Typography, Button, Card, List, Spin, message, Modal, Tag, InputNumber, Space, Alert, Select, Divider } from 'antd';
import { FileTextOutlined, CrownOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { analysisApi, authApi, schoolApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import type { AnalysisReport, Subject, ExamInfo } from '../../types';

const FREE_LIMIT = 2;

const StudentAnalysis: React.FC = () => {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewContent, setViewContent] = useState<string | null>(null);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(10);
  const [recharging, setRecharging] = useState(false);

  const [selectedSubjectId, setSelectedSubjectId] = useState<number>();
  const [selectedExamName, setSelectedExamName] = useState<string>();

  const { user, setUser } = useAuthStore();

  const freeRemaining = Math.max(0, FREE_LIMIT - (user?.free_report_used || 0));
  const credits = user?.credits || 0;
  const canGenerate = freeRemaining > 0 || credits > 0;

  useEffect(() => {
    schoolApi.getMySubjects().then(res => setSubjects(res.data));
    analysisApi.listExams().then(res => setExams(res.data));
  }, []);

  const loadReports = () => {
    setLoading(true);
    analysisApi.listReports().then(res => setReports(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadReports(); }, []);

  const handleGenerate = async () => {
    if (!canGenerate) {
      setShowRecharge(true);
      return;
    }
    setGenerating(true);
    try {
      const res = await analysisApi.generateReport({
        subject_id: selectedSubjectId,
        exam_name: selectedExamName,
      });
      message.success('分析报告已生成');
      const me = await authApi.getMe();
      setUser(me.data);
      loadReports();
      setViewContent(res.data.content);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setShowRecharge(true);
      }
      message.error(err.response?.data?.detail || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleRecharge = async () => {
    setRecharging(true);
    try {
      const res = await authApi.recharge(rechargeAmount);
      setUser(res.data);
      message.success(`充值成功！已增加 ${rechargeAmount} 次使用额度`);
      setShowRecharge(false);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '充值失败');
    } finally {
      setRecharging(false);
    }
  };

  const filterLabel = () => {
    const parts: string[] = [];
    parts.push(selectedSubjectId ? subjects.find(s => s.id === selectedSubjectId)?.name || '' : '全部科目');
    parts.push(selectedExamName || '全部考试');
    return parts.join(' · ');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>成绩分析报告</Typography.Title>
        <Space wrap>
          <Tag icon={<ThunderboltOutlined />} color={freeRemaining > 0 ? 'green' : 'default'}>
            免费 {freeRemaining}/{FREE_LIMIT}
          </Tag>
          <Tag icon={<CrownOutlined />} color={credits > 0 ? 'gold' : 'default'}>
            额度 {credits} 次
          </Tag>
          <Button size="small" onClick={() => setShowRecharge(true)}>充值</Button>
        </Space>
      </div>

      {!canGenerate && (
        <Alert message="免费次数已用完" description="您的免费分析报告次数已用完，请充值后继续使用 AI 分析功能。"
          type="warning" showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" type="primary" onClick={() => setShowRecharge(true)}>去充值</Button>} />
      )}

      <Card title="生成分析报告" size="small" style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary">
          选择科目和考试进行精细化分析。不选则默认分析全部成绩。
        </Typography.Paragraph>
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            allowClear placeholder="全部科目" style={{ width: 150 }}
            value={selectedSubjectId} onChange={setSelectedSubjectId}
            options={subjects.map(s => ({ value: s.id, label: s.name }))}
          />
          <Select
            allowClear placeholder="全部考试" style={{ width: 220 }}
            value={selectedExamName} onChange={setSelectedExamName}
            options={exams.map(e => ({ value: e.exam_name, label: e.exam_name }))}
          />
          <Button type="primary" onClick={handleGenerate} loading={generating} icon={<FileTextOutlined />}>
            生成分析报告
          </Button>
        </Space>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            分析范围：{filterLabel()}
          </Typography.Text>
        </div>
      </Card>

      <Divider orientation="left">历史报告</Divider>

      <Spin spinning={loading}>
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2 }}
          dataSource={reports}
          renderItem={(item) => (
            <List.Item>
              <Card hoverable
                title={`${item.report_type === 'grade_analysis' ? '成绩分析' : '试卷分析'}报告`}
                extra={<span style={{ color: '#999' }}>{item.created_at?.slice(0, 10)}</span>}
                onClick={() => setViewContent(item.content)}
              >
                <Typography.Paragraph ellipsis={{ rows: 3 }}>
                  {item.content.replace(/[#*`]/g, '').slice(0, 200)}...
                </Typography.Paragraph>
              </Card>
            </List.Item>
          )}
          locale={{ emptyText: '暂无分析报告' }}
        />
      </Spin>

      <Modal title="分析报告详情" open={!!viewContent} onCancel={() => setViewContent(null)} footer={null} width={700}>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, maxHeight: '70vh', overflow: 'auto' }}>{viewContent}</div>
      </Modal>

      <Modal title="充值使用次数" open={showRecharge} onCancel={() => setShowRecharge(false)}
        onOk={handleRecharge} confirmLoading={recharging} okText="确认充值">
        <div style={{ marginBottom: 16 }}>
          <Typography.Paragraph>每次使用 AI 分析功能消耗 1 次额度。</Typography.Paragraph>
          <Typography.Text type="secondary">新用户免费赠送 {FREE_LIMIT} 次成绩分析 + {FREE_LIMIT} 次试卷分析。</Typography.Text>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Typography.Text strong>当前剩余：</Typography.Text>
          <Tag color="green" style={{ marginLeft: 8 }}>免费分析 {freeRemaining} 次</Tag>
          <Tag color="gold">付费额度 {credits} 次</Tag>
        </div>
        <div>
          <Typography.Text strong>充值次数：</Typography.Text>
          <InputNumber min={1} max={999} value={rechargeAmount} onChange={(v) => setRechargeAmount(v || 1)}
            style={{ marginLeft: 8, width: 120 }} />
          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>（模拟充值，无需付款）</Typography.Text>
        </div>
      </Modal>
    </div>
  );
};

export default StudentAnalysis;

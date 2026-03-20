import React, { useEffect, useState } from 'react';
import { Typography, Upload, Button, Table, message, Modal, Input, Space, Tag, InputNumber, Alert } from 'antd';
import { UploadOutlined, DownloadOutlined, FileSearchOutlined, CrownOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { paperApi, authApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import type { ExamPaper } from '../../types';

const FREE_LIMIT = 2;

const StudentPapers: React.FC = () => {
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [analysisContent, setAnalysisContent] = useState<string | null>(null);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(10);
  const [recharging, setRecharging] = useState(false);
  const { user, setUser } = useAuthStore();

  const freeRemaining = Math.max(0, FREE_LIMIT - (user?.free_paper_used || 0));
  const credits = user?.credits || 0;
  const canAnalyze = freeRemaining > 0 || credits > 0;

  const loadPapers = () => {
    setLoading(true);
    paperApi.list().then(res => setPapers(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadPapers(); }, []);

  const handleUpload = async (file: File) => {
    try {
      await paperApi.upload(file, subject || undefined);
      message.success('上传成功');
      loadPapers();
    } catch {
      message.error('上传失败');
    }
    return false;
  };

  const handleDownload = async (id: number, fileName: string) => {
    try {
      const res = await paperApi.download(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('下载失败');
    }
  };

  const handleAnalyze = async (id: number) => {
    if (!canAnalyze) {
      setShowRecharge(true);
      return;
    }
    setAnalyzing(id);
    try {
      const res = await paperApi.analyze(id);
      setAnalysisContent(res.data.content);
      const me = await authApi.getMe();
      setUser(me.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setShowRecharge(true);
      }
      message.error(err.response?.data?.detail || '分析失败');
    } finally {
      setAnalyzing(null);
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

  const columns = [
    { title: '文件名', dataIndex: 'file_name', key: 'file_name' },
    { title: '科目', dataIndex: 'subject', key: 'subject', render: (v: string) => v || '-' },
    { title: '上传日期', dataIndex: 'upload_date', key: 'upload_date', render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作', key: 'actions',
      render: (_: unknown, record: ExamPaper) => (
        <Space>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record.id, record.file_name)}>下载</Button>
          <Button size="small" icon={<FileSearchOutlined />} loading={analyzing === record.id}
            onClick={() => handleAnalyze(record.id)}>AI分析</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>试卷管理</Typography.Title>
        <Space>
          <Tag icon={<ThunderboltOutlined />} color={freeRemaining > 0 ? 'green' : 'default'}>
            免费分析 {freeRemaining}/{FREE_LIMIT}
          </Tag>
          <Tag icon={<CrownOutlined />} color={credits > 0 ? 'gold' : 'default'}>
            额度 {credits} 次
          </Tag>
          <Button size="small" onClick={() => setShowRecharge(true)}>充值</Button>
        </Space>
      </div>

      {!canAnalyze && (
        <Alert message="免费次数已用完" description="试卷 AI 分析免费次数已用完，请充值后继续使用。"
          type="warning" showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" type="primary" onClick={() => setShowRecharge(true)}>去充值</Button>} />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="科目（可选）" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 150 }} />
        <Upload beforeUpload={handleUpload as any} showUploadList={false} accept="image/*,.pdf">
          <Button icon={<UploadOutlined />} type="primary">上传试卷</Button>
        </Upload>
      </Space>
      <Table columns={columns} dataSource={papers} rowKey="id" loading={loading} />

      <Modal title="试卷分析报告" open={!!analysisContent} onCancel={() => setAnalysisContent(null)} footer={null} width={700}>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{analysisContent}</div>
      </Modal>

      <Modal title="充值使用次数" open={showRecharge} onCancel={() => setShowRecharge(false)}
        onOk={handleRecharge} confirmLoading={recharging} okText="确认充值">
        <Typography.Paragraph>每次 AI 分析消耗 1 次额度。成绩分析和试卷分析共享付费额度。</Typography.Paragraph>
        <div style={{ marginBottom: 16 }}>
          <Tag color="green">免费试卷分析 {freeRemaining} 次</Tag>
          <Tag color="gold">付费额度 {credits} 次</Tag>
        </div>
        <div>
          <Typography.Text strong>充值次数：</Typography.Text>
          <InputNumber min={1} max={999} value={rechargeAmount} onChange={(v) => setRechargeAmount(v || 1)}
            style={{ marginLeft: 8, width: 120 }} />
          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>（模拟充值）</Typography.Text>
        </div>
      </Modal>
    </div>
  );
};

export default StudentPapers;

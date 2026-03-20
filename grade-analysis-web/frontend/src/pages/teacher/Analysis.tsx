import React, { useEffect, useState } from 'react';
import { Typography, Button, Card, List, Spin, message, Modal, Select, Space, Divider, Tag, InputNumber, Alert } from 'antd';
import { FileTextOutlined, TeamOutlined, CrownOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { analysisApi, schoolApi, authApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import type { AnalysisReport, StudentInfo, Subject, ExamInfo } from '../../types';

const FREE_LIMIT = 2;

const TeacherAnalysis: React.FC = () => {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [gradeNames, setGradeNames] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewContent, setViewContent] = useState<string | null>(null);

  const [classGradeName, setClassGradeName] = useState<string>();
  const [classSubjectId, setClassSubjectId] = useState<number>();
  const [classExamName, setClassExamName] = useState<string>();
  const [generatingClass, setGeneratingClass] = useState(false);

  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(10);
  const [recharging, setRecharging] = useState(false);
  const { user, setUser } = useAuthStore();

  const classFreeRemaining = Math.max(0, FREE_LIMIT - (user?.free_class_report_used || 0));
  const studentFreeRemaining = Math.max(0, FREE_LIMIT - (user?.free_student_report_used || 0));
  const credits = user?.credits || 0;
  const canClassReport = classFreeRemaining > 0 || credits > 0;
  const canStudentReport = studentFreeRemaining > 0 || credits > 0;

  useEffect(() => {
    analysisApi.listStudents().then(res => setStudents(res.data));
    schoolApi.getMySubjects().then(res => setSubjects(res.data));
    analysisApi.listExams().then(res => setExams(res.data));
    analysisApi.listGradeNames().then(res => setGradeNames(res.data));
  }, []);

  const loadReports = (sid?: number) => {
    setLoading(true);
    analysisApi.listReports(sid).then(res => setReports(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadReports(selectedStudent); }, [selectedStudent]);

  const refreshUser = async () => {
    const me = await authApi.getMe();
    setUser(me.data);
  };

  const handleGenerateStudent = async () => {
    if (!selectedStudent) { message.warning('请先选择学生'); return; }
    if (!canStudentReport) { setShowRecharge(true); return; }
    setGenerating(true);
    try {
      await analysisApi.generateReport({ student_id: selectedStudent });
      message.success('学生报告已生成');
      await refreshUser();
      loadReports(selectedStudent);
    } catch (err: any) {
      if (err.response?.status === 403) setShowRecharge(true);
      message.error(err.response?.data?.detail || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateClass = async () => {
    if (!canClassReport) { setShowRecharge(true); return; }
    setGeneratingClass(true);
    try {
      const res = await analysisApi.generateClassReport({
        grade_name: classGradeName,
        subject_id: classSubjectId,
        exam_name: classExamName,
      });
      message.success('班级分析报告已生成');
      await refreshUser();
      loadReports(selectedStudent);
      setViewContent(res.data.content);
    } catch (err: any) {
      if (err.response?.status === 403) setShowRecharge(true);
      message.error(err.response?.data?.detail || '生成失败');
    } finally {
      setGeneratingClass(false);
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

  const reportTypeLabel = (type: string) => {
    const map: Record<string, { text: string; color: string }> = {
      grade_analysis: { text: '学生分析', color: 'blue' },
      class_analysis: { text: '班级分析', color: 'purple' },
      paper_analysis: { text: '试卷分析', color: 'green' },
    };
    return map[type] || { text: type, color: 'default' };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>成绩分析报告</Typography.Title>
        <Space wrap>
          <Tag icon={<ThunderboltOutlined />} color={classFreeRemaining > 0 ? 'green' : 'default'}>
            班级报告免费 {classFreeRemaining}/{FREE_LIMIT}
          </Tag>
          <Tag icon={<ThunderboltOutlined />} color={studentFreeRemaining > 0 ? 'green' : 'default'}>
            学生报告免费 {studentFreeRemaining}/{FREE_LIMIT}
          </Tag>
          <Tag icon={<CrownOutlined />} color={credits > 0 ? 'gold' : 'default'}>
            付费额度 {credits} 次
          </Tag>
          <Button size="small" onClick={() => setShowRecharge(true)}>充值</Button>
        </Space>
      </div>

      <Card title="班级整体分析" size="small" style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary">
          选择班级、科目、考试进行组合分析。不选则默认为"全部"。
        </Typography.Paragraph>
        <Space wrap style={{ marginBottom: 12 }}>
          <Select allowClear placeholder="全部班级" style={{ width: 150 }} value={classGradeName}
            onChange={setClassGradeName} options={gradeNames.map(g => ({ value: g, label: g }))} />
          <Select allowClear placeholder="全部科目" style={{ width: 150 }} value={classSubjectId}
            onChange={setClassSubjectId} options={subjects.map(s => ({ value: s.id, label: s.name }))} />
          <Select allowClear placeholder="全部考试" style={{ width: 200 }} value={classExamName}
            onChange={setClassExamName} options={exams.map(e => ({ value: e.exam_name, label: e.exam_name }))} />
          <Button type="primary" icon={<TeamOutlined />} onClick={handleGenerateClass} loading={generatingClass}>
            生成班级报告 {!canClassReport && '(需充值)'}
          </Button>
        </Space>
      </Card>

      <Card title="学生个人分析" size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Select placeholder="选择学生" style={{ width: 200 }} onChange={setSelectedStudent} showSearch allowClear
            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={students.map(s => ({ value: s.id, label: `${s.real_name} (${s.student_no})` }))} />
          <Button type="primary" onClick={handleGenerateStudent} loading={generating} icon={<FileTextOutlined />}>
            生成学生报告 {!canStudentReport && '(需充值)'}
          </Button>
        </Space>
      </Card>

      <Divider orientation="left">历史报告</Divider>

      <Spin spinning={loading}>
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2 }}
          dataSource={reports}
          renderItem={(item) => {
            const typeInfo = reportTypeLabel(item.report_type);
            return (
              <List.Item>
                <Card hoverable
                  title={<Space><Tag color={typeInfo.color}>{typeInfo.text}</Tag><span>分析报告</span></Space>}
                  extra={<span style={{ color: '#999', fontSize: 12 }}>{item.created_at?.slice(0, 10)}</span>}
                  onClick={() => setViewContent(item.content)}
                >
                  <Typography.Paragraph ellipsis={{ rows: 3 }}>
                    {item.content.replace(/[#*`|]/g, '').slice(0, 200)}...
                  </Typography.Paragraph>
                </Card>
              </List.Item>
            );
          }}
          locale={{ emptyText: '暂无报告' }}
        />
      </Spin>

      <Modal title="报告详情" open={!!viewContent} onCancel={() => setViewContent(null)} footer={null} width={750}>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, maxHeight: '70vh', overflow: 'auto' }}>{viewContent}</div>
      </Modal>

      <Modal title="充值使用次数" open={showRecharge} onCancel={() => setShowRecharge(false)}
        onOk={handleRecharge} confirmLoading={recharging} okText="确认充值">
        <Typography.Paragraph>每次生成 AI 分析报告消耗 1 次额度。班级报告和学生报告共享付费额度。</Typography.Paragraph>
        <div style={{ marginBottom: 16 }}>
          <Tag color="green">班级报告免费 {classFreeRemaining} 次</Tag>
          <Tag color="green">学生报告免费 {studentFreeRemaining} 次</Tag>
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

export default TeacherAnalysis;

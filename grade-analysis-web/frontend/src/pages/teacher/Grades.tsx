import React, { useEffect, useState } from 'react';
import { Table, Typography, Select, Space, Tag, Button, InputNumber, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { gradeApi, schoolApi, analysisApi } from '../../api';
import type { Grade, Subject, ExamInfo, StudentInfo } from '../../types';

const TeacherGrades: React.FC = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [subjectId, setSubjectId] = useState<number>();
  const [examName, setExamName] = useState<string>();
  const [studentId, setStudentId] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<Grade>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deleting, setDeleting] = useState(false);

  const loadGrades = () => {
    setLoading(true);
    gradeApi.list({ student_id: studentId, subject_id: subjectId, exam_name: examName })
      .then(res => setGrades(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    schoolApi.getMySubjects().then(res => setSubjects(res.data));
    analysisApi.listExams().then(res => setExams(res.data));
    analysisApi.listStudents().then(res => setStudents(res.data));
  }, []);

  useEffect(() => { loadGrades(); }, [studentId, subjectId, examName]);

  const startEdit = (record: Grade) => {
    setEditingId(record.id);
    setEditValues({ score: record.score, total_score: record.total_score });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (id: number) => {
    try {
      await gradeApi.update(id, editValues);
      message.success('修改成功');
      cancelEdit();
      loadGrades();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '修改失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await gradeApi.delete(id);
      message.success('删除成功');
      loadGrades();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    setDeleting(true);
    try {
      const res = await gradeApi.batchDelete(selectedRowKeys as number[]);
      message.success(res.data.message);
      setSelectedRowKeys([]);
      loadGrades();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '批量删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { title: '学生', dataIndex: 'student_name', key: 'student_name', width: 90 },
    { title: '学号', dataIndex: 'student_no', key: 'student_no', width: 100 },
    { title: '考试', dataIndex: 'exam_name', key: 'exam_name', width: 160 },
    { title: '科目', dataIndex: 'subject_name', key: 'subject_name', width: 80 },
    {
      title: '成绩', dataIndex: 'score', key: 'score', width: 120,
      render: (score: number, record: Grade) => {
        if (editingId === record.id) {
          return (
            <InputNumber size="small" min={0} max={editValues.total_score || 300}
              value={editValues.score}
              onChange={(v) => setEditValues(prev => ({ ...prev, score: v ?? 0 }))}
              style={{ width: 85 }} />
          );
        }
        return <Tag color={score >= 90 ? 'green' : score >= 60 ? 'blue' : 'red'}>{score}</Tag>;
      },
      sorter: (a: Grade, b: Grade) => a.score - b.score,
    },
    {
      title: '满分', dataIndex: 'total_score', key: 'total_score', width: 90,
      render: (val: number, record: Grade) => {
        if (editingId === record.id) {
          return (
            <InputNumber size="small" min={1} max={300}
              value={editValues.total_score}
              onChange={(v) => setEditValues(prev => ({ ...prev, total_score: v ?? 100 }))}
              style={{ width: 65 }} />
          );
        }
        return val;
      },
    },
    { title: '日期', dataIndex: 'exam_date', key: 'exam_date', width: 110 },
    {
      title: '操作', key: 'actions', width: 140, fixed: 'right' as const,
      render: (_: unknown, record: Grade) => {
        if (editingId === record.id) {
          return (
            <Space size="small">
              <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => saveEdit(record.id)}>保存</Button>
              <Button type="link" size="small" icon={<CloseOutlined />} onClick={cancelEdit}>取消</Button>
            </Space>
          );
        }
        return (
          <Space size="small">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => startEdit(record)}
              disabled={editingId !== null}>修改</Button>
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}
              okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}
                disabled={editingId !== null}>删除</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>成绩管理</Typography.Title>
        {selectedRowKeys.length > 0 && (
          <Popconfirm
            title={`确定删除选中的 ${selectedRowKeys.length} 条成绩？`}
            onConfirm={handleBatchDelete}
            okText="批量删除" cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger loading={deleting}>
              批量删除 ({selectedRowKeys.length})
            </Button>
          </Popconfirm>
        )}
      </div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select allowClear placeholder="筛选学生" style={{ width: 150 }} onChange={setStudentId} showSearch
          filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          options={students.map(s => ({ value: s.id, label: s.real_name }))} />
        <Select allowClear placeholder="筛选科目" style={{ width: 150 }} onChange={setSubjectId}
          options={subjects.map(s => ({ value: s.id, label: s.name }))} />
        <Select allowClear placeholder="筛选考试" style={{ width: 200 }} onChange={setExamName}
          options={exams.map(e => ({ value: e.exam_name, label: e.exam_name }))} />
      </Space>
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={grades}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 900 }}
      />
    </div>
  );
};

export default TeacherGrades;

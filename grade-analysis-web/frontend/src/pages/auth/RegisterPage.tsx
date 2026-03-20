import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Select, Cascader, Space, AutoComplete } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { authApi, schoolApi } from '../../api';
import type { Region, School } from '../../types';

const GRADE_LEVELS = [
  { value: 'elementary', label: '小学' },
  { value: 'middle', label: '初中' },
  { value: 'high', label: '高中' },
];

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<number | undefined>();
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>();
  const [role, setRole] = useState<string>('student');
  const [schoolText, setSchoolText] = useState('');
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    schoolApi.getRegionTree().then(res => setRegions(res.data));
  }, []);

  useEffect(() => {
    if (selectedRegion) {
      schoolApi.listSchools({
        region_id: selectedRegion,
        grade_level: selectedGradeLevel,
      }).then(res => setSchools(res.data));
    } else {
      setSchools([]);
    }
  }, [selectedRegion, selectedGradeLevel]);

  const regionOptions = regions.map(prov => ({
    value: prov.id,
    label: prov.name,
    children: prov.children?.map(city => ({
      value: city.id,
      label: city.name,
      children: city.children?.map(dist => ({
        value: dist.id,
        label: dist.name,
      })),
    })),
  }));

  const schoolOptions = schools
    .filter(s => s.name.toLowerCase().includes(schoolText.toLowerCase()))
    .map(s => ({ value: s.name, label: s.name, schoolId: s.id }));

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const matchedSchool = schools.find(s => s.name === values.school_input);
      const regionIds: number[] = values.region || [];
      const regionId = regionIds.length > 0 ? regionIds[regionIds.length - 1] : undefined;

      await authApi.register({
        username: values.username,
        password: values.password,
        real_name: values.real_name,
        role: values.role,
        school_id: matchedSchool?.id,
        school_name: matchedSchool ? undefined : values.school_input,
        region_id: regionId,
        grade_level: values.grade_level,
        grade_name: values.grade_name,
        student_no: values.student_no,
      });
      message.success('注册成功，请登录');
      navigate('/login');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 500, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <Typography.Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
          用户注册
        </Typography.Title>
        <Form form={form} onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="role" label="角色" rules={[{ required: true }]} initialValue="student">
            <Select onChange={(v) => setRole(v)} options={[
              { value: 'student', label: '学生' },
              { value: 'teacher', label: '教师' },
            ]} />
          </Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item name="real_name" label="真实姓名" rules={[{ required: true, message: '请输入真实姓名' }]}>
            <Input placeholder="请输入真实姓名" />
          </Form.Item>
          {role === 'student' && (
            <Form.Item name="student_no" label="学号" rules={[{ required: true, message: '请输入学号' }]}>
              <Input placeholder="请输入学号" />
            </Form.Item>
          )}
          <Form.Item name="grade_level" label="学段" rules={[{ required: true }]}>
            <Select
              options={GRADE_LEVELS}
              placeholder="请选择学段"
              onChange={(v) => setSelectedGradeLevel(v)}
            />
          </Form.Item>
          <Form.Item name="region" label="所在地区" rules={[{ required: true, message: '请选择地区' }]}>
            <Cascader
              options={regionOptions}
              placeholder="请选择省/市/区"
              onChange={(val) => {
                if (val && val.length > 0) {
                  setSelectedRegion(val[val.length - 1] as number);
                } else {
                  setSelectedRegion(undefined);
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="school_input"
            label="学校"
            rules={[{ required: true, message: '请输入或选择学校名称' }]}
            extra="可直接输入学校名称，系统会自动创建；也可从下拉列表中选择已有学校"
          >
            <AutoComplete
              options={schoolOptions}
              placeholder="输入学校名称（支持自定义）"
              onSearch={(text) => setSchoolText(text)}
              filterOption={false}
            />
          </Form.Item>
          <Form.Item name="grade_name" label="年级">
            <Input placeholder="如：高一、初二、三年级" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              注册
            </Button>
          </Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'center' }}>
            <Typography.Text>已有账号？</Typography.Text>
            <Link to="/login">去登录</Link>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;

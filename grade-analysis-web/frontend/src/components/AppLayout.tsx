import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Modal, Select, Cascader, AutoComplete, message } from 'antd';
import {
  DashboardOutlined, UploadOutlined, BarChartOutlined,
  LineChartOutlined, PieChartOutlined, SwapOutlined,
  RiseOutlined, FileTextOutlined, TrophyOutlined,
  LogoutOutlined, UserOutlined, BookOutlined, SettingOutlined, SwapOutlined as SwapIcon,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi, schoolApi } from '../api';
import type { Region, School } from '../types';

const { Header, Sider, Content } = Layout;

const GRADE_LEVEL_MAP: Record<string, string> = {
  elementary: '小学', middle: '初中', high: '高中',
};

const studentMenuItems = [
  { key: '/student/dashboard', icon: <DashboardOutlined />, label: '首页' },
  { key: '/student/grades', icon: <BookOutlined />, label: '成绩查看' },
  { key: '/student/upload', icon: <UploadOutlined />, label: '成绩上传' },
  { key: '/student/analysis', icon: <FileTextOutlined />, label: '分析报告' },
  { key: '/student/ranking', icon: <TrophyOutlined />, label: '得分率' },
  { key: '/student/trends', icon: <LineChartOutlined />, label: '成绩趋势' },
  { key: '/student/distribution', icon: <PieChartOutlined />, label: '成绩分布' },
  { key: '/student/comparison', icon: <SwapOutlined />, label: '成绩对比' },
  { key: '/student/prediction', icon: <RiseOutlined />, label: '成绩预测' },
  { key: '/student/papers', icon: <BarChartOutlined />, label: '试卷管理' },
];

const teacherMenuItems = [
  { key: '/teacher/dashboard', icon: <DashboardOutlined />, label: '首页' },
  { key: '/teacher/grades', icon: <BookOutlined />, label: '成绩管理' },
  { key: '/teacher/upload', icon: <UploadOutlined />, label: '批量上传' },
  { key: '/teacher/analysis', icon: <FileTextOutlined />, label: '分析报告' },
  { key: '/teacher/ranking', icon: <TrophyOutlined />, label: '成绩排名' },
  { key: '/teacher/trends', icon: <LineChartOutlined />, label: '成绩趋势' },
  { key: '/teacher/distribution', icon: <PieChartOutlined />, label: '成绩分布' },
  { key: '/teacher/comparison', icon: <SwapOutlined />, label: '成绩对比' },
  { key: '/teacher/prediction', icon: <RiseOutlined />, label: '成绩预测' },
];

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, setUser } = useAuthStore();
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  const [regions, setRegions] = useState<Region[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [formGradeLevel, setFormGradeLevel] = useState('');
  const [formRegionPath, setFormRegionPath] = useState<number[]>([]);
  const [formSchoolText, setFormSchoolText] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<number | undefined>();

  const menuItems = user?.role === 'teacher' ? teacherMenuItems : studentMenuItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchRole = async () => {
    try {
      const res = await authApi.switchRole();
      setUser(res.data);
      const newRole = res.data.role;
      message.success(`已切换为${newRole === 'teacher' ? '教师' : '学生'}模式`);
      navigate(`/${newRole}/dashboard`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '切换失败');
    }
  };

  const openSettings = () => {
    setFormGradeLevel(user?.grade_level || '');
    setFormRegionPath(user?.region_path || []);
    setSelectedRegionId(user?.region_id || undefined);
    setFormSchoolText(user?.school_name || '');
    setShowSettings(true);
  };

  useEffect(() => {
    if (showSettings && regions.length === 0) {
      schoolApi.getRegionTree().then(res => setRegions(res.data));
    }
  }, [showSettings]);

  useEffect(() => {
    if (selectedRegionId && showSettings) {
      schoolApi.listSchools({ region_id: selectedRegionId, grade_level: formGradeLevel || undefined })
        .then(res => setSchools(res.data));
    }
  }, [selectedRegionId, formGradeLevel, showSettings]);

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

  const schoolAutoOptions = schools
    .filter(s => s.name.toLowerCase().includes(formSchoolText.toLowerCase()))
    .map(s => ({ value: s.name, label: s.name, schoolId: s.id }));

  const handleSave = async () => {
    if (!formGradeLevel) {
      message.warning('请选择学段');
      return;
    }
    if (formRegionPath.length === 0) {
      message.warning('请选择地区');
      return;
    }
    if (!formSchoolText.trim()) {
      message.warning('请输入或选择学校');
      return;
    }

    const matchedSchool = schools.find(s => s.name === formSchoolText);
    const regionId = formRegionPath[formRegionPath.length - 1];

    setSaving(true);
    try {
      const res = await authApi.updateSchool({
        school_id: matchedSchool?.id,
        school_name: matchedSchool ? undefined : formSchoolText,
        region_id: regionId,
        grade_level: formGradeLevel,
      });
      setUser(res.data);
      message.success(`已切换到 ${res.data.school_name} · ${GRADE_LEVEL_MAP[formGradeLevel]}`);
      setShowSettings(false);
      window.location.reload();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '切换失败');
    } finally {
      setSaving(false);
    }
  };

  const currentLevel = user?.grade_level ? GRADE_LEVEL_MAP[user.grade_level] || user.grade_level : '';

  const dropdownItems = {
    items: [
      { key: 'info', label: `${user?.real_name} (${user?.role === 'teacher' ? '教师' : '学生'})`, disabled: true },
      { key: 'school', label: `${user?.school_name || '未设置学校'}${currentLevel ? ` · ${currentLevel}` : ''}`, disabled: true },
      { type: 'divider' as const },
      {
        key: 'switchRole', icon: <SwapIcon />,
        label: `切换为${user?.role === 'teacher' ? '学生' : '教师'}模式`,
        onClick: handleSwitchRole,
      },
      { key: 'settings', icon: <SettingOutlined />, label: '切换学段/学校', onClick: openSettings },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="dark" breakpoint="lg" collapsedWidth={60}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography.Text strong style={{ color: '#fff', fontSize: 16 }}>
            成绩分析系统
          </Typography.Text>
        </div>
        <Menu
          theme="dark" mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={dropdownItems}>
            <Button type="text" style={{ height: 'auto' }}>
              <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
              {user?.real_name}
              {currentLevel && <Typography.Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>({currentLevel})</Typography.Text>}
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>

      <Modal
        title="切换学段 / 学校"
        open={showSettings}
        onOk={handleSave}
        onCancel={() => setShowSettings(false)}
        confirmLoading={saving}
        okText="确认切换"
        width={480}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          当前：<strong>{user?.school_name}</strong> · <strong>{currentLevel || '未设置'}</strong>
        </Typography.Paragraph>

        <div style={{ marginBottom: 16 }}>
          <Typography.Text strong>学段</Typography.Text>
          <Select
            value={formGradeLevel || undefined}
            onChange={setFormGradeLevel}
            style={{ width: '100%', marginTop: 4 }}
            placeholder="选择学段"
            options={[
              { value: 'elementary', label: '小学' },
              { value: 'middle', label: '初中' },
              { value: 'high', label: '高中' },
            ]}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Typography.Text strong>所在地区</Typography.Text>
          <Cascader
            value={formRegionPath}
            options={regionOptions}
            placeholder="选择省/市/区"
            style={{ width: '100%', marginTop: 4 }}
            onChange={(val) => {
              const ids = (val || []) as number[];
              setFormRegionPath(ids);
              setSelectedRegionId(ids.length > 0 ? ids[ids.length - 1] : undefined);
            }}
          />
        </div>

        <div>
          <Typography.Text strong>学校</Typography.Text>
          <AutoComplete
            value={formSchoolText}
            options={schoolAutoOptions}
            placeholder="输入学校名称（支持自定义）"
            style={{ width: '100%', marginTop: 4 }}
            onSearch={setFormSchoolText}
            onChange={setFormSchoolText}
            filterOption={false}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            可从列表选择，也可直接输入新学校名称
          </Typography.Text>
        </div>
      </Modal>
    </Layout>
  );
};

export default AppLayout;

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './stores/authStore';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import StudentDashboard from './pages/student/Dashboard';
import StudentGrades from './pages/student/Grades';
import StudentUpload from './pages/student/Upload';
import StudentAnalysis from './pages/student/Analysis';
import StudentRanking from './pages/student/Ranking';
import StudentTrends from './pages/student/Trends';
import StudentDistribution from './pages/student/Distribution';
import StudentComparison from './pages/student/Comparison';
import StudentPrediction from './pages/student/Prediction';
import StudentPapers from './pages/student/Papers';

import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherGrades from './pages/teacher/Grades';
import TeacherUpload from './pages/teacher/Upload';
import TeacherAnalysis from './pages/teacher/Analysis';
import TeacherRanking from './pages/teacher/Ranking';
import TeacherTrends from './pages/teacher/Trends';
import TeacherDistribution from './pages/teacher/Distribution';
import TeacherComparison from './pages/teacher/Comparison';
import TeacherPrediction from './pages/teacher/Prediction';

const App: React.FC = () => {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#5b21b6', borderRadius: 8 } }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/student" element={
            <ProtectedRoute role="student"><AppLayout /></ProtectedRoute>
          }>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="grades" element={<StudentGrades />} />
            <Route path="upload" element={<StudentUpload />} />
            <Route path="analysis" element={<StudentAnalysis />} />
            <Route path="ranking" element={<StudentRanking />} />
            <Route path="trends" element={<StudentTrends />} />
            <Route path="distribution" element={<StudentDistribution />} />
            <Route path="comparison" element={<StudentComparison />} />
            <Route path="prediction" element={<StudentPrediction />} />
            <Route path="papers" element={<StudentPapers />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="/teacher" element={
            <ProtectedRoute role="teacher"><AppLayout /></ProtectedRoute>
          }>
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="grades" element={<TeacherGrades />} />
            <Route path="upload" element={<TeacherUpload />} />
            <Route path="analysis" element={<TeacherAnalysis />} />
            <Route path="ranking" element={<TeacherRanking />} />
            <Route path="trends" element={<TeacherTrends />} />
            <Route path="distribution" element={<TeacherDistribution />} />
            <Route path="comparison" element={<TeacherComparison />} />
            <Route path="prediction" element={<TeacherPrediction />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;

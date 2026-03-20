import client from './client';
import type {
  Token, User, Region, School, Subject, Grade, GradeStats,
  GradeDistribution, GradeRanking, GradeTrend, SubjectComparison,
  GradePrediction, AnalysisReport, ExamInfo, StudentInfo, ExamPaper,
  StudentGradeDistribution,
} from '../types';

export const authApi = {
  login: (username: string, password: string) =>
    client.post<Token>('/auth/login', { username, password }),
  register: (data: {
    username: string; password: string; real_name: string;
    role: string; school_id?: number; school_name?: string;
    region_id?: number; grade_level?: string;
    grade_name?: string; student_no?: string;
  }) => client.post<User>('/auth/register', data),
  getMe: () => client.get<User>('/auth/me'),
  updateSchool: (data: {
    school_id?: number; school_name?: string; region_id?: number;
    grade_level?: string; grade_name?: string;
  }) => client.put<User>('/auth/update-school', data),
  switchRole: () => client.put<User>('/auth/switch-role'),
  recharge: (amount: number) => client.post<User>('/auth/recharge', null, { params: { amount } }),
  getCredits: () => client.get<Record<string, any>>('/auth/credits'),
};

export const schoolApi = {
  getRegionTree: () => client.get<Region[]>('/schools/regions/tree'),
  getRegions: (params?: { level?: string; parent_id?: number }) =>
    client.get<Region[]>('/schools/regions', { params }),
  listSchools: (params?: { region_id?: number; grade_level?: string; search?: string; sort_by?: string }) =>
    client.get<School[]>('/schools', { params }),
  createSchool: (data: { name: string; region_id: number; grade_level: string }) =>
    client.post<School>('/schools', data),
  getSubjects: (grade_level?: string) =>
    client.get<Subject[]>('/schools/subjects', { params: { grade_level } }),
  getMySubjects: () => client.get<Subject[]>('/schools/my-subjects'),
};

export const gradeApi = {
  create: (data: {
    subject_id: number; score: number; total_score?: number;
    exam_name: string; exam_date: string; student_id?: number;
  }) => client.post<Grade>('/grades', data),
  batchCreate: (data: {
    exam_name: string; exam_date: string;
    grades: { subject_id: number; score: number; total_score?: number }[];
  }) => client.post<{ created: number; subjects: string[] }>('/grades/batch', data),
  batchUpload: (file: File, exam_name: string, exam_date: string, subject_id: number, grade_name?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/grades/batch-upload', formData, {
      params: { exam_name, exam_date, subject_id, grade_name: grade_name || '' },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (params?: { student_id?: number; subject_id?: number; exam_name?: string }) =>
    client.get<Grade[]>('/grades', { params }),
  getMyGrades: () => client.get<Grade[]>('/grades/my'),
  update: (id: number, data: { score?: number; total_score?: number; exam_name?: string; exam_date?: string; subject_id?: number }) =>
    client.put<Grade>(`/grades/${id}`, data),
  delete: (id: number) => client.delete(`/grades/${id}`),
  batchDelete: (ids: number[]) => client.post<{ deleted: number; message: string }>('/grades/batch-delete', ids),
};

export const analysisApi = {
  getStats: (params?: { student_id?: number; subject_id?: number; exam_name?: string }) =>
    client.get<GradeStats>('/analysis/stats', { params }),
  getDistribution: (params?: { subject_id?: number; exam_name?: string }) =>
    client.get<GradeDistribution[]>('/analysis/distribution', { params }),
  getMyDistribution: (exam_name?: string) =>
    client.get<StudentGradeDistribution[]>('/analysis/my-distribution', { params: { exam_name } }),
  getRanking: (subject_id: number, exam_name: string) =>
    client.get<GradeRanking[]>('/analysis/ranking', { params: { subject_id, exam_name } }),
  getTrends: (params?: { student_id?: number; subject_id?: number }) =>
    client.get<GradeTrend[]>('/analysis/trends', { params }),
  getComparison: (exam_name: string, student_id?: number) =>
    client.get<SubjectComparison[]>('/analysis/comparison', { params: { exam_name, student_id } }),
  getPrediction: (student_id?: number) =>
    client.get<GradePrediction[]>('/analysis/prediction', { params: { student_id } }),
  generateReport: (data: { student_id?: number; subject_id?: number; exam_name?: string }) =>
    client.post<AnalysisReport>('/analysis/report', data),
  listReports: (student_id?: number) =>
    client.get<AnalysisReport[]>('/analysis/reports', { params: { student_id } }),
  listExams: () => client.get<ExamInfo[]>('/analysis/exams'),
  listStudents: () => client.get<StudentInfo[]>('/analysis/students'),
  listGradeNames: () => client.get<string[]>('/analysis/grade-names'),
  generateClassReport: (data: { grade_name?: string; subject_id?: number; exam_name?: string }) =>
    client.post<AnalysisReport>('/analysis/class-report', data),
  downloadTemplate: (mode: 'all' | 'single' = 'all') =>
    client.get('/analysis/upload-template', { params: { mode }, responseType: 'blob' }),
};

export const paperApi = {
  upload: (file: File, subject?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (subject) formData.append('subject', subject);
    return client.post('/papers/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: () => client.get<ExamPaper[]>('/papers'),
  download: (id: number) => client.get(`/papers/${id}/download`, { responseType: 'blob' }),
  analyze: (id: number) => client.post<{ id: number; content: string }>(`/papers/${id}/analyze`),
};

import { request, uploadFile } from './client';

export const authApi = {
  login: (username: string, password: string) =>
    request({ url: '/auth/login', method: 'POST', data: { username, password } }),
  wxLogin: (code: string) =>
    request({ url: '/auth/wx-login', method: 'POST', data: { code } }),
  completeProfile: (data: any) =>
    request({ url: '/auth/complete-profile', method: 'PUT', data }),
  register: (data: any) =>
    request({ url: '/auth/register', method: 'POST', data }),
  getMe: () => request({ url: '/auth/me' }),
  switchRole: () => request({ url: '/auth/switch-role', method: 'PUT' }),
  recharge: (amount: number) =>
    request({ url: `/auth/recharge?amount=${amount}`, method: 'POST' }),
  getCredits: () => request({ url: '/auth/credits' }),
  updateSchool: (data: any) => request({ url: '/auth/update-school', method: 'PUT', data }),
};

export const schoolApi = {
  getRegionTree: () => request({ url: '/schools/regions/tree' }),
  listSchools: (params?: any) => {
    const qs = params ? '?' + Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request({ url: `/schools${qs}` });
  },
  getMySubjects: () => request({ url: '/schools/my-subjects' }),
};

export const gradeApi = {
  create: (data: any) => request({ url: '/grades', method: 'POST', data }),
  batchCreate: (data: any) => request({ url: '/grades/batch', method: 'POST', data }),
  list: (params?: any) => {
    const qs = params ? '?' + Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request({ url: `/grades${qs}` });
  },
  getMyGrades: () => request({ url: '/grades/my' }),
  update: (id: number, data: any) => request({ url: `/grades/${id}`, method: 'PUT', data }),
  delete: (id: number) => request({ url: `/grades/${id}`, method: 'DELETE' }),
  batchDelete: (ids: number[]) => request({ url: '/grades/batch-delete', method: 'POST', data: ids }),
  batchUpload: (filePath: string, examName: string, examDate: string, subjectId: number, gradeName: string) =>
    uploadFile({
      url: `/grades/batch-upload?exam_name=${encodeURIComponent(examName)}&exam_date=${examDate}&subject_id=${subjectId}&grade_name=${encodeURIComponent(gradeName)}`,
      filePath,
      name: 'file',
    }),
};

export const analysisApi = {
  getStats: (params?: any) => {
    const qs = params ? '?' + Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request({ url: `/analysis/stats${qs}` });
  },
  getDistribution: (params?: any) => {
    const qs = params ? '?' + Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request({ url: `/analysis/distribution${qs}` });
  },
  getMyDistribution: (exam_name?: string) =>
    request({ url: `/analysis/my-distribution${exam_name ? '?exam_name=' + exam_name : ''}` }),
  getRanking: (subject_id: number, exam_name: string) =>
    request({ url: `/analysis/ranking?subject_id=${subject_id}&exam_name=${exam_name}` }),
  getTrends: (params?: any) => {
    const qs = params ? '?' + Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request({ url: `/analysis/trends${qs}` });
  },
  getComparison: (exam_name: string, student_id?: number) =>
    request({ url: `/analysis/comparison?exam_name=${exam_name}${student_id ? '&student_id=' + student_id : ''}` }),
  getPrediction: (student_id?: number) =>
    request({ url: `/analysis/prediction${student_id ? '?student_id=' + student_id : ''}` }),
  generateReport: (data: any) => request({ url: '/analysis/report', method: 'POST', data }),
  generateClassReport: (data: any) => request({ url: '/analysis/class-report', method: 'POST', data }),
  listReports: (student_id?: number) =>
    request({ url: `/analysis/reports${student_id ? '?student_id=' + student_id : ''}` }),
  listExams: () => request({ url: '/analysis/exams' }),
  listStudents: () => request({ url: '/analysis/students' }),
  listGradeNames: () => request({ url: '/analysis/grade-names' }),
};

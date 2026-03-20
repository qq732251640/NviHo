export interface User {
  id: number;
  username: string;
  real_name: string;
  role: 'student' | 'teacher';
  school_id: number;
  grade_name?: string;
  student_no?: string;
  school_name?: string;
  grade_level?: string;
  region_id?: number;
  region_path?: number[];
  credits?: number;
  free_report_used?: number;
  free_paper_used?: number;
  free_class_report_used?: number;
  free_student_report_used?: number;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Region {
  id: number;
  name: string;
  level: string;
  parent_id?: number;
  children?: Region[];
}

export interface School {
  id: number;
  name: string;
  region_id: number;
  grade_level: string;
  region_name?: string;
}

export interface Subject {
  id: number;
  name: string;
  grade_level: string;
}

export interface Grade {
  id: number;
  student_id: number;
  subject_id: number;
  score: number;
  total_score: number;
  exam_name: string;
  exam_date: string;
  student_name?: string;
  student_no?: string;
  subject_name?: string;
}

export interface GradeStats {
  average: number;
  highest: number;
  lowest: number;
  count: number;
  subject_name?: string;
}

export interface GradeDistribution {
  range_label: string;
  count: number;
  percentage: number;
}

export interface StudentGradeDistribution {
  range_label: string;
  subjects: string[];
  count: number;
}

export interface GradeRanking {
  rank: number;
  student_name: string;
  student_no?: string;
  score: number;
  subject_name?: string;
}

export interface GradeTrend {
  exam_name: string;
  exam_date: string;
  score: number;
  subject_name?: string;
}

export interface SubjectComparison {
  subject_name: string;
  score: number;
  average: number;
}

export interface GradePrediction {
  subject_name: string;
  historical_scores: number[];
  predicted_score: number;
  exam_dates: string[];
}

export interface AnalysisReport {
  id: number;
  user_id: number;
  report_type: string;
  content: string;
  created_at?: string;
}

export interface ExamInfo {
  exam_name: string;
  exam_date: string;
}

export interface StudentInfo {
  id: number;
  real_name: string;
  student_no?: string;
  grade_name?: string;
}

export interface ExamPaper {
  id: number;
  file_name: string;
  subject?: string;
  upload_date?: string;
}

export type GradingScale = '5.0' | '4.0';

export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Course {
  id: string;
  code: string;
  title: string;
  unit: number;
  grade: GradeLetter;
}

export interface Semester {
  id: string;
  name: string;
  courses: Course[];
}

export interface Year {
  id: string;
  name: string;
  semesters: Semester[];
}

export interface GradeOption {
  letter: GradeLetter;
  value5: number;
  value4: number;
}
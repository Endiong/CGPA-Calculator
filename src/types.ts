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
  isExcluded?: boolean;
}

export interface GradeOption {
  letter: GradeLetter;
  value5: number;
  value4: number;
}

/** Min/max score range that maps to a grade letter (used for numerical score conversion) */
export interface ScoreRange {
  min: number;
  max: number;
}

/** Maps each grade letter to a score range */
export type ScoreRangeMap = Record<GradeLetter, ScoreRange>;

/** Maps each grade letter to a custom point value for each scale */
export interface GradePointOverrides {
  value5: number;
  value4: number;
}

export type GradePointMap = Record<GradeLetter, GradePointOverrides>;

/** Complete grading configuration for a user */
export interface GradingConfig {
  /** Human-readable preset name */
  presetName: string;
  /** Point values per letter grade */
  gradePoints: GradePointMap;
  /** Score ranges for numerical-to-letter conversion */
  scoreRanges: ScoreRangeMap;
}
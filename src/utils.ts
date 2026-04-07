import { GRADE_OPTIONS } from './constants';
import { Course, GradingConfig, GradeLetter, GradingScale, Year } from './types';

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Returns the point value for a grade letter.
 * If a custom GradingConfig is provided, uses its grade point values.
 * Falls back to the legacy GRADE_OPTIONS table if not provided.
 */
export const getGradeValue = (grade: string, scale: GradingScale, config?: GradingConfig): number => {
  if (config) {
    const entry = config.gradePoints[grade as GradeLetter];
    if (entry) return scale === '5.0' ? entry.value5 : entry.value4;
  }
  const option = GRADE_OPTIONS.find((g) => g.letter === grade);
  if (!option) return 0;
  return scale === '5.0' ? option.value5 : option.value4;
};

/**
 * Converts a numerical score to a grade letter using the configured score ranges.
 * Grades are checked in order A→F and the first matching range wins.
 */
export const scoreToGrade = (score: number, config: GradingConfig): GradeLetter => {
  const letters: GradeLetter[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (const letter of letters) {
    const range = config.scoreRanges[letter];
    if (score >= range.min && score <= range.max) return letter;
  }
  return 'F';
};

export const calculateSemesterStats = (courses: Course[], scale: GradingScale, config?: GradingConfig) => {
  let totalUnits = 0;
  let totalPoints = 0;

  courses.forEach((course) => {
    const unit = Number(course.unit) || 0;
    if (unit > 0) {
      totalUnits += unit;
      const point = getGradeValue(course.grade, scale, config);
      totalPoints += unit * point;
    }
  });

  const gpa = totalUnits === 0 ? 0 : totalPoints / totalUnits;

  return { totalUnits, totalPoints, gpa };
};

export const calculateOverallStats = (years: Year[], scale: GradingScale, config?: GradingConfig) => {
  let grandTotalUnits = 0;
  let grandTotalPoints = 0;

  years.forEach((year) => {
    if (year.isExcluded) return;

    year.semesters.forEach((semester) => {
      const stats = calculateSemesterStats(semester.courses, scale, config);
      grandTotalUnits += stats.totalUnits;
      grandTotalPoints += stats.totalPoints;
    });
  });

  const cgpa = grandTotalUnits === 0 ? 0 : grandTotalPoints / grandTotalUnits;

  return { grandTotalUnits, grandTotalPoints, cgpa };
};

export const getClassOfDegree = (cgpa: number, scale: GradingScale): string => {
  if (cgpa === 0) return 'No Grade Yet';

  if (scale === '5.0') {
    if (cgpa >= 4.50) return 'First Class Honours';
    if (cgpa >= 3.50) return 'Second Class Upper';
    if (cgpa >= 2.40) return 'Second Class Lower';
    if (cgpa >= 1.50) return 'Third Class';
    if (cgpa >= 1.00) return 'Pass';
    return 'Fail';
  } else {
    if (cgpa >= 3.50) return 'First Class Honours';
    if (cgpa >= 3.00) return 'Second Class Upper';
    if (cgpa >= 2.00) return 'Second Class Lower';
    if (cgpa >= 1.00) return 'Third Class';
    return 'Fail';
  }
};

export const getGradeColor = (cgpa: number, scale: GradingScale): string => {
  if (scale === '5.0') {
    if (cgpa >= 4.50) return 'text-emerald-600 dark:text-emerald-400';
    if (cgpa >= 3.50) return 'text-teal-600 dark:text-teal-400';
    if (cgpa >= 2.40) return 'text-amber-600 dark:text-amber-400';
    if (cgpa >= 1.50) return 'text-orange-600 dark:text-orange-400';
    if (cgpa >= 1.00) return 'text-rose-600 dark:text-rose-400';
    return 'text-red-600 dark:text-red-400';
  } else {
    if (cgpa >= 3.50) return 'text-emerald-600 dark:text-emerald-400';
    if (cgpa >= 3.00) return 'text-teal-600 dark:text-teal-400';
    if (cgpa >= 2.00) return 'text-amber-600 dark:text-amber-400';
    if (cgpa >= 1.00) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  }
};

export const getGradeColorRGB = (cgpa: number, scale: GradingScale): [number, number, number] => {
  if (cgpa === 0) return [156, 163, 175];

  if (scale === '5.0') {
    if (cgpa >= 4.50) return [5, 150, 105];
    if (cgpa >= 3.50) return [13, 148, 136];
    if (cgpa >= 2.40) return [217, 119, 6];
    if (cgpa >= 1.50) return [234, 88, 12];
    if (cgpa >= 1.00) return [225, 29, 72];
    return [220, 38, 38];
  } else {
    if (cgpa >= 3.50) return [5, 150, 105];
    if (cgpa >= 3.00) return [13, 148, 136];
    if (cgpa >= 2.00) return [217, 119, 6];
    if (cgpa >= 1.00) return [234, 88, 12];
    return [220, 38, 38];
  }
};

export const createEmptyCourses = (count: number) =>
  Array.from({ length: count }).map(() => ({
    id: generateId(),
    code: '',
    title: '',
    unit: 0,
    grade: 'A' as const
  }));
import { GRADE_OPTIONS } from './constants';
import { Course, GradingScale, Year } from './types';

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const getGradeValue = (grade: string, scale: GradingScale): number => {
  const option = GRADE_OPTIONS.find((g) => g.letter === grade);
  if (!option) return 0;
  return scale === '5.0' ? option.value5 : option.value4;
};

export const calculateSemesterStats = (courses: Course[], scale: GradingScale) => {
  let totalUnits = 0;
  let totalPoints = 0;

  courses.forEach((course) => {
    // Only calculate if unit is valid number
    const unit = Number(course.unit) || 0;
    if (unit > 0) {
      totalUnits += unit;
      const point = getGradeValue(course.grade, scale);
      totalPoints += unit * point;
    }
  });

  const gpa = totalUnits === 0 ? 0 : totalPoints / totalUnits;

  return { totalUnits, totalPoints, gpa };
};

export const calculateOverallStats = (years: Year[], scale: GradingScale) => {
  let grandTotalUnits = 0;
  let grandTotalPoints = 0;

  years.forEach((year) => {
    if (year.isExcluded) return; // Skip excluded years

    year.semesters.forEach((semester) => {
      const stats = calculateSemesterStats(semester.courses, scale);
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
    // Standard 4.0 Scale Mapping
    if (cgpa >= 3.50) return 'First Class Honours';
    if (cgpa >= 3.00) return 'Second Class Upper';
    if (cgpa >= 2.00) return 'Second Class Lower';
    if (cgpa >= 1.00) return 'Third Class';
    return 'Fail';
  }
};

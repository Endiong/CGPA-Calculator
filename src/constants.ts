import { GradeOption, GradingConfig, GradeLetter, Year } from './types';

// ─── Legacy grade options (used for backwards-compat display) ───────────────


export const GRADE_OPTIONS: GradeOption[] = [
  { letter: 'A', value5: 5.0, value4: 4.0 },
  { letter: 'B', value5: 4.0, value4: 3.0 },
  { letter: 'C', value5: 3.0, value4: 2.0 },
  { letter: 'D', value5: 2.0, value4: 1.0 },
  { letter: 'E', value5: 1.0, value4: 0.0 }, // E is usually 0 on 4.0 scale
  { letter: 'F', value5: 0.0, value4: 0.0 },
];

export const getInitialData = (): Year[] => {
  const createEmptyCourses = (count: number) => 
    Array.from({ length: count }).map((_, i) => ({
      id: `init-${Math.random().toString(36).substr(2, 9)}`,
      code: '',
      title: '',
      unit: 0,
      grade: 'A' as const
    }));

  return [
    {
      id: 'year-1',
      name: 'Year 1',
      semesters: [
        {
          id: 'y1-s1',
          name: 'First Semester',
          courses: createEmptyCourses(3),
        },
        {
          id: 'y1-s2',
          name: 'Second Semester',
          courses: createEmptyCourses(3),
        },
      ],
    },
  ];
};

// ─── Grading Config Presets ──────────────────────────────────────────────────

const GRADE_LETTERS: GradeLetter[] = ['A', 'B', 'C', 'D', 'E', 'F'];

/** NUC/JAMB standard used by most Nigerian federal & state universities */
export const NUC_STANDARD_CONFIG: GradingConfig = {
  presetName: 'Federal / State University',
  gradePoints: {
    A: { value5: 5.0, value4: 4.0 },
    B: { value5: 4.0, value4: 3.0 },
    C: { value5: 3.0, value4: 2.0 },
    D: { value5: 2.0, value4: 1.0 },
    E: { value5: 1.0, value4: 0.0 },
    F: { value5: 0.0, value4: 0.0 },
  },
  scoreRanges: {
    A: { min: 70, max: 100 },
    B: { min: 60, max: 69 },
    C: { min: 50, max: 59 },
    D: { min: 45, max: 49 },
    E: { min: 40, max: 44 },
    F: { min: 0,  max: 39 },
  },
};

/** Private university style — higher bar for A */
export const COVENANT_STYLE_CONFIG: GradingConfig = {
  presetName: 'Private University',
  gradePoints: {
    A: { value5: 5.0, value4: 4.0 },
    B: { value5: 4.0, value4: 3.0 },
    C: { value5: 3.0, value4: 2.0 },
    D: { value5: 2.0, value4: 1.0 },
    E: { value5: 1.0, value4: 0.0 },
    F: { value5: 0.0, value4: 0.0 },
  },
  scoreRanges: {
    A: { min: 75, max: 100 },
    B: { min: 65, max: 74 },
    C: { min: 55, max: 64 },
    D: { min: 45, max: 54 },
    E: { min: 40, max: 44 },
    F: { min: 0,  max: 39 },
  },
};

export const GRADING_PRESETS: GradingConfig[] = [
  NUC_STANDARD_CONFIG,
  COVENANT_STYLE_CONFIG,
];

export const DEFAULT_GRADING_CONFIG: GradingConfig = NUC_STANDARD_CONFIG;

/** Loads grading config from localStorage or returns default */
export const getGradingConfig = (): GradingConfig => {
  try {
    const saved = localStorage.getItem('grading_config');
    if (saved) return JSON.parse(saved) as GradingConfig;
  } catch { }
  return DEFAULT_GRADING_CONFIG;
};
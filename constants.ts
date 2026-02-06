import { GradeOption, Year } from './types';

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
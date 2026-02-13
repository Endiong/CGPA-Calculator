import React from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import { Course, GradingScale, GradeLetter } from '../types';
import { GRADE_OPTIONS } from '../constants';
import { getGradeValue } from '../utils';

interface CourseRowProps {
  index: number;
  course: Course;
  scale: GradingScale;
  onChange: (id: string, field: keyof Course, value: string | number) => void;
  onDelete: (id: string) => void;
}

const CourseRow: React.FC<CourseRowProps> = ({ index, course, scale, onChange, onDelete }) => {
  const points = (Number(course.unit) || 0) * getGradeValue(course.grade, scale);

  return (
    <tr className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <td className="px-3 md:px-4 py-2.5 text-gray-400 dark:text-gray-500 font-mono text-xs">
        {index + 1}
      </td>
      <td className="px-3 md:px-4 py-2.5">
        <input
          type="text"
          value={course.code}
          onChange={(e) => onChange(course.id, 'code', e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="CODE"
          className="w-full bg-transparent border-none p-0 text-gray-900 dark:text-gray-100 font-medium focus:ring-0 focus:outline-none uppercase placeholder-gray-300 dark:placeholder-gray-600 text-sm"
        />
      </td>
      <td className="px-3 md:px-4 py-2.5">
        <input
          type="text"
          value={course.title}
          onChange={(e) => onChange(course.id, 'title', e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="Course Title"
          className="w-full bg-transparent border-none p-0 text-gray-600 dark:text-gray-400 focus:ring-0 focus:outline-none placeholder-gray-300 dark:placeholder-gray-600 text-sm"
        />
      </td>
      <td className="px-3 md:px-4 py-2.5">
        <input
          type="number"
          min="0"
          value={course.unit}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(course.id, 'unit', parseInt(e.target.value) || 0)}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-gray-700 rounded text-center p-1 text-gray-900 dark:text-gray-100 focus:ring-0 focus:outline-none font-medium text-sm transition-colors"
        />
      </td>
      <td className="px-3 md:px-4 py-2.5">
        <div className="relative">
          <select
            value={course.grade}
            onChange={(e) => onChange(course.id, 'grade', e.target.value as GradeLetter)}
            className="w-full appearance-none py-1.5 pl-2.5 pr-6 rounded font-medium focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 text-xs cursor-pointer border transition-colors focus:outline-none bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
          >
            {GRADE_OPTIONS.map((opt) => (
              <option key={opt.letter} value={opt.letter}>
                {opt.letter}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-400">
            <ChevronDown size={12} />
          </div>
        </div>
      </td>
      <td className="px-3 md:px-4 py-2.5 text-right font-bold text-gray-900 dark:text-gray-100 text-sm">
        {points.toFixed(1)}
      </td>
      <td className="px-3 md:px-4 py-2.5 text-center">
        <button
          onClick={() => onDelete(course.id)}
          className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Remove Course"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
};

export default CourseRow;
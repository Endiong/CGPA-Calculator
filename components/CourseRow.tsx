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
    <tr className="group hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <td className="px-4 md:px-6 py-3 text-gray-400 font-mono text-xs">
        {index + 1}
      </td>
      <td className="px-4 md:px-6 py-3">
        <input
          type="text"
          value={course.code}
          onChange={(e) => onChange(course.id, 'code', e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="CODE"
          className="w-full bg-transparent border-none p-0 text-gray-900 font-medium focus:ring-0 uppercase placeholder-gray-300 text-sm md:text-base"
        />
      </td>
      <td className="px-4 md:px-6 py-3">
        <input
          type="text"
          value={course.title}
          onChange={(e) => onChange(course.id, 'title', e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="Course Title"
          className="w-full bg-transparent border-none p-0 text-gray-600 focus:ring-0 placeholder-gray-300 text-sm md:text-base"
        />
      </td>
      <td className="px-4 md:px-6 py-3">
        <input
          type="number"
          min="0"
          value={course.unit}
          onFocus={(e) => e.target.select()} // Auto-select text on click
          onChange={(e) => onChange(course.id, 'unit', parseInt(e.target.value) || 0)}
          className="w-full bg-gray-50 border border-transparent focus:border-primary focus:bg-white rounded text-center p-1 text-gray-900 focus:ring-0 font-medium text-sm md:text-base transition-colors"
        />
      </td>
      <td className="px-4 md:px-6 py-3">
        <div className="relative">
          <select
            value={course.grade}
            onChange={(e) => onChange(course.id, 'grade', e.target.value as GradeLetter)}
            className={`w-full appearance-none py-1.5 pl-3 pr-7 rounded font-medium focus:ring-1 focus:ring-primary focus:border-primary text-sm cursor-pointer border transition-colors truncate
              ${course.grade === 'A' ? 'bg-green-50 border-green-200 text-green-700' : 
                course.grade === 'B' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                course.grade === 'C' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                course.grade === 'F' ? 'bg-red-50 border-red-200 text-red-700' :
                'bg-gray-50 border-gray-200 text-gray-700'
              }`}
          >
            {GRADE_OPTIONS.map((opt) => (
              <option key={opt.letter} value={opt.letter}>
                {opt.letter} ({scale === '5.0' ? opt.value5.toFixed(1) : opt.value4.toFixed(1)})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <ChevronDown size={14} />
          </div>
        </div>
      </td>
      <td className="px-4 md:px-6 py-3 text-right font-bold text-gray-900 text-sm md:text-base">
        {points.toFixed(1)}
      </td>
      <td className="px-4 md:px-6 py-3 text-center">
        <button
          onClick={() => onDelete(course.id)}
          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
          title="Remove Course"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
};

export default CourseRow;
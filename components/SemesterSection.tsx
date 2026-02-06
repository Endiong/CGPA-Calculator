import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Semester, GradingScale, Course } from '../types';
import { calculateSemesterStats } from '../utils';
import CourseRow from './CourseRow';

interface SemesterSectionProps {
  semester: Semester;
  scale: GradingScale;
  onUpdateCourse: (semesterId: string, courseId: string, field: keyof Course, value: string | number) => void;
  onAddCourse: (semesterId: string) => void;
  onDeleteCourse: (semesterId: string, courseId: string) => void;
}

const SemesterSection: React.FC<SemesterSectionProps> = ({
  semester,
  scale,
  onUpdateCourse,
  onAddCourse,
  onDeleteCourse,
}) => {
  const stats = calculateSemesterStats(semester.courses, scale);

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#111418] flex items-center gap-2">
          <span className="w-1.5 h-6 bg-primary rounded-full"></span>
          {semester.name}
        </h2>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${stats.gpa >= 4.5 ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-700'}`}>
          GPA: {stats.gpa.toFixed(2)}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {/* Added min-w-[XXXpx] to columns to prevent squashing on mobile */}
          <table className="w-full text-left border-collapse min-w-[650px] md:min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-4 md:px-6 py-4 w-12 text-gray-400">S/N</th>
                <th className="px-4 md:px-6 py-4 w-32 min-w-[100px]">Code</th>
                <th className="px-4 md:px-6 py-4 min-w-[180px]">Course Title</th>
                <th className="px-4 md:px-6 py-4 w-20 min-w-[80px] text-center">Units</th>
                <th className="px-4 md:px-6 py-4 w-36 min-w-[150px]">Grade</th>
                <th className="px-4 md:px-6 py-4 w-24 min-w-[80px] text-right">Points</th>
                <th className="px-4 md:px-6 py-4 w-16 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {semester.courses.map((course, index) => (
                <CourseRow
                  key={course.id}
                  index={index}
                  course={course}
                  scale={scale}
                  onChange={(id, field, value) => onUpdateCourse(semester.id, id, field, value)}
                  onDelete={(id) => onDeleteCourse(semester.id, id)}
                />
              ))}
              {semester.courses.length === 0 && (
                 <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400 italic">
                        No courses added yet. Click "Add Course" to begin.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 bg-gray-50 p-2">
          <button
            onClick={() => onAddCourse(semester.id)}
            className="flex items-center justify-center w-full py-2.5 text-sm font-bold text-primary hover:bg-primary/5 rounded border border-dashed border-primary/30 transition-colors gap-2"
          >
            <PlusCircle size={18} />
            Add Course
          </button>
        </div>
      </div>
    </div>
  );
};

export default SemesterSection;
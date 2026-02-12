import React, { useState } from 'react';
import { PlusCircle, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Semester, GradingScale, Course } from '../types';
import { calculateSemesterStats } from '../utils';
import CourseRow from './CourseRow';

interface SemesterSectionProps {
  semester: Semester;
  scale: GradingScale;
  onUpdateCourse: (semesterId: string, courseId: string, field: keyof Course, value: string | number) => void;
  onAddCourse: (semesterId: string) => void;
  onDeleteCourse: (semesterId: string, courseId: string) => void;
  onDeleteSemester: (semesterId: string) => void;
}

const SemesterSection: React.FC<SemesterSectionProps> = ({
  semester,
  scale,
  onUpdateCourse,
  onAddCourse,
  onDeleteCourse,
  onDeleteSemester,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const stats = calculateSemesterStats(semester.courses, scale);

  return (
    <div className="mb-6 animate-fade-in border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Header Section */}
      <div
        className="flex items-center justify-between p-4 bg-gray-50/50 cursor-pointer select-none border-b border-gray-100"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <button
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              {semester.name}
            </h2>
            <div className={`w-fit px-2.5 py-0.5 rounded-full text-xs font-bold ${stats.gpa >= 4.5 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              GPA: {stats.gpa.toFixed(2)}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSemester(semester.id);
          }}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
          title="Delete Semester"
        >
          <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Content Section (Collapsible) */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 bg-white">
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            {/* Added min-w-[XXXpx] to columns to prevent squashing on mobile */}
            <table className="w-full text-left border-collapse min-w-[650px] md:min-w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  <th className="px-4 py-3 w-12 text-gray-400">S/N</th>
                  <th className="px-4 py-3 w-32 min-w-[100px]">Code</th>
                  <th className="px-4 py-3 min-w-[180px]">Course Title</th>
                  <th className="px-4 py-3 w-20 min-w-[80px] text-center">Units</th>
                  <th className="px-4 py-3 w-36 min-w-[150px]">Grade</th>
                  <th className="px-4 py-3 w-24 min-w-[80px] text-right">Points</th>
                  <th className="px-4 py-3 w-16 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
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
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic bg-gray-50/30">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-lg">No courses yet</span>
                        <span className="text-xs">Add courses to calculate GPA</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <button
              onClick={() => onAddCourse(semester.id)}
              className="flex items-center justify-center w-full py-3 text-sm font-bold text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 hover:border-primary/50 transition-all gap-2 group"
            >
              <PlusCircle size={18} className="group-hover:scale-110 transition-transform" />
              Add Course
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemesterSection;

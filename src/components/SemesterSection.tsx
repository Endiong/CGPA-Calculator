import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Semester, GradingScale, Course } from '../types';
import { calculateSemesterStats, getGradeColor } from '../utils';
import CourseRow from './CourseRow';
import CourseCard from './CourseCard';

interface SemesterSectionProps {
  semester: Semester;
  scale: GradingScale;
  onUpdateCourse: (semesterId: string, courseId: string, field: keyof Course, value: string | number) => void;
  onAddCourse: (semesterId: string) => void;
  onDeleteCourse: (semesterId: string, courseId: string) => void;
  onDeleteSemester: (semesterId: string) => void;
  viewMode: 'table' | 'card';
}

const SemesterSection: React.FC<SemesterSectionProps> = ({
  semester,
  scale,
  onUpdateCourse,
  onAddCourse,
  onDeleteCourse,
  onDeleteSemester,
  viewMode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const stats = calculateSemesterStats(semester.courses, scale);
  const colorClass = getGradeColor(stats.gpa, scale);
  const bgColorClass = colorClass.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-').replace('600', '50').replace('400', '900/30');

  const emptyBadge = stats.totalUnits === 0;

  return (
    <div className="rounded-xl bg-white/80 dark:bg-[#141420]/80 backdrop-blur-xl overflow-hidden transition-colors shadow-lg shadow-black/5 dark:shadow-black/40">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none border-b border-gray-100 dark:border-gray-700/50"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2.5">
          <div className="text-gray-400 dark:text-gray-500">
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{semester.name}</h2>
          {emptyBadge ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
              —
            </span>
          ) : (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${bgColorClass} ${colorClass}`}>
              {stats.gpa.toFixed(2)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isCollapsed && stats.totalUnits > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mr-2 hidden sm:inline">
              {stats.totalUnits} units · {stats.totalPoints.toFixed(0)} pts
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSemester(semester.id);
            }}
            className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete Semester"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div>
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px] md:min-w-full">
                <thead>
                  <tr className="bg-gray-50/60 dark:bg-gray-800/50 border-b border-gray-100/80 dark:border-gray-700 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
                    <th className="px-3 md:px-4 py-2 w-10">S/N</th>
                    <th className="px-3 md:px-4 py-2 w-24 min-w-[80px]">Code</th>
                    <th className="px-3 md:px-4 py-2 min-w-[140px]">Title</th>
                    <th className="px-3 md:px-4 py-2 w-16 text-center">Units</th>
                    <th className="px-3 md:px-4 py-2 w-20">Grade</th>
                    <th className="px-3 md:px-4 py-2 w-16 text-right">Pts</th>
                    <th className="px-3 md:px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
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
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                        No courses yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {semester.courses.map((course, index) => (
                  <CourseCard
                    key={course.id}
                    index={index}
                    course={course}
                    scale={scale}
                    onChange={(id, field, value) => onUpdateCourse(semester.id, id, field, value)}
                    onDelete={(id) => onDeleteCourse(semester.id, id)}
                  />
                ))}
              </div>
              {semester.courses.length === 0 && (
                <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl">
                  No courses yet
                </div>
              )}
            </div>
          )}

          {/* Add Course */}
          <div className="px-4 py-3 border-t border-gray-50 dark:border-gray-700/50">
            <button
              onClick={() => onAddCourse(semester.id)}
              className="flex items-center justify-center w-full py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-white/5 rounded-lg transition-all gap-1.5"
            >
              <Plus size={14} />
              Add Course
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemesterSection;
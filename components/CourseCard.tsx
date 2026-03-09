import React from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import { Course, GradingScale, GradeLetter } from '../types';
import { GRADE_OPTIONS } from '../constants';
import { getGradeValue } from '../utils';

interface CourseCardProps {
    index: number;
    course: Course;
    scale: GradingScale;
    onChange: (id: string, field: keyof Course, value: string | number) => void;
    onDelete: (id: string) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ index, course, scale, onChange, onDelete }) => {
    const points = (Number(course.unit) || 0) * getGradeValue(course.grade, scale);

    return (
        <div className="group bg-white dark:bg-[#1a1a24] p-4 rounded-xl border border-gray-100 dark:border-gray-700/40 shadow-sm transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600">

            {/* Top Row: Code, Title, Delete */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="flex-none text-xs font-bold text-gray-300 dark:text-gray-600 font-mono">
                        {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                        <input
                            type="text"
                            value={course.code}
                            onChange={(e) => onChange(course.id, 'code', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="CODE"
                            className="w-full bg-transparent border-none p-0 text-base font-bold text-gray-900 dark:text-gray-100 focus:ring-0 focus:outline-none uppercase placeholder-gray-400 dark:placeholder-gray-600 mb-0.5"
                        />
                        <input
                            type="text"
                            value={course.title}
                            onChange={(e) => onChange(course.id, 'title', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="Course Title (Optional)"
                            className="w-full bg-transparent border-none p-0 text-xs text-gray-500 dark:text-gray-400 focus:ring-0 focus:outline-none placeholder-gray-400 dark:placeholder-gray-600"
                        />
                    </div>
                </div>

                <button
                    onClick={() => onDelete(course.id)}
                    className="flex-none p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Bottom Row: Units, Grade, Points */}
            <div className="flex items-center gap-3">
                {/* Units */}
                <div className="flex-1 min-w-0">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1">Units</label>
                    <input
                        type="number"
                        min="0"
                        value={course.unit}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => onChange(course.id, 'unit', parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-50 dark:bg-[#0a0a14] border border-transparent focus:border-gray-400 dark:focus:border-gray-500 focus:bg-white dark:focus:bg-gray-700 rounded-lg text-center py-2 px-1 text-gray-900 dark:text-gray-100 focus:ring-0 focus:outline-none font-bold text-sm transition-all"
                    />
                </div>

                {/* Grade */}
                <div className="flex-[2] min-w-0">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1">Grade</label>
                    <div className="relative">
                        <select
                            value={course.grade}
                            onChange={(e) => onChange(course.id, 'grade', e.target.value as GradeLetter)}
                            className="w-full appearance-none py-2 pl-3 pr-8 rounded-lg font-bold text-sm cursor-pointer border transition-all focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 bg-gray-50 border-gray-200 text-gray-700 dark:bg-[#0a0a14] dark:border-gray-600 dark:text-gray-300"
                        >
                            {GRADE_OPTIONS.map((opt) => (
                                <option key={opt.letter} value={opt.letter}>
                                    {opt.letter}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-current opacity-50 pointer-events-none" />
                    </div>
                </div>

                {/* Points - Read only */}
                <div className="flex-1 min-w-0">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 text-right">Points</label>
                    <div className="py-2 px-1 text-right">
                        <span className="text-sm font-black text-gray-900 dark:text-gray-100 block">
                            {points.toFixed(1)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseCard;

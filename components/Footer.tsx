import React from 'react';
import { GradingScale } from '../types';
import { getClassOfDegree, getGradeColor } from '../utils';

interface FooterProps {
  scale: GradingScale;
  onScaleChange: (scale: GradingScale) => void;
  totalUnits: number;
  totalPoints: number;
  cgpa: number;
}

const Footer: React.FC<FooterProps> = ({ scale, onScaleChange, totalUnits, totalPoints, cgpa }) => {
  const degreeClass = getClassOfDegree(cgpa, scale);
  // If no units entered, show neutral gray; otherwise use the grade-based color
  const colorClass = totalUnits === 0 ? 'text-gray-400 dark:text-gray-500' : getGradeColor(cgpa, scale);

  return (
    <footer className="flex-none fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#1a1a24]/95 backdrop-blur-md border-t border-gray-100/80 dark:border-gray-700/40 z-30 transition-colors">
      <div className="max-w-[960px] mx-auto px-4 py-3">
        <div className="flex items-center justify-between">

          {/* Scale toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 hidden sm:inline">Scale:</span>
            <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => onScaleChange('4.0')}
                title="Use 4.0 Grading Scale"
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${scale === '4.0'
                  ? 'bg-white dark:bg-gray-100 text-gray-900 shadow-sm border border-gray-200 dark:border-gray-300'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border border-transparent'
                  }`}
              >
                4.0
              </button>
              <button
                onClick={() => onScaleChange('5.0')}
                title="Use 5.0 Grading Scale"
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${scale === '5.0'
                  ? 'bg-white dark:bg-gray-100 text-gray-900 shadow-sm border border-gray-200 dark:border-gray-300'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border border-transparent'
                  }`}
              >
                5.0
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:block text-right">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase block">Units</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{totalUnits}</span>
            </div>

            <div className="hidden sm:block text-right">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase block">Class</span>
              <span className={`text-xs font-bold transition-colors ${colorClass}`}>
                {degreeClass}
              </span>
            </div>

            {/* CGPA */}
            <div className="text-right">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase block">CGPA</span>
              <div className="flex items-baseline gap-0.5">
                <span className={`text-2xl font-extrabold transition-colors leading-none ${colorClass}`}>{cgpa.toFixed(2)}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">/{scale}</span>
              </div>
              <span className={`sm:hidden text-[10px] font-semibold transition-colors ${colorClass}`}>{degreeClass}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
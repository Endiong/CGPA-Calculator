import React from 'react';
import { GradingScale } from '../types';
import { getClassOfDegree } from '../utils';

interface FooterProps {
  scale: GradingScale;
  onScaleChange: (scale: GradingScale) => void;
  totalUnits: number;
  totalPoints: number;
  cgpa: number;
}

const Footer: React.FC<FooterProps> = ({ scale, onScaleChange, totalUnits, totalPoints, cgpa }) => {
  const degreeClass = getClassOfDegree(cgpa, scale);

  return (
    <footer className="flex-none fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Grading Scale Toggle */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-500 hidden sm:inline">Grading System:</span>
            <div className="relative inline-flex bg-gray-100 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => onScaleChange('4.0')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all duration-200 ${
                  scale === '4.0'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                4.0 Scale
              </button>
              <button
                onClick={() => onScaleChange('5.0')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all duration-200 ${
                  scale === '5.0'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                5.0 Scale
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end">
            <div className="flex flex-col md:items-end">
              <span className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide">Total Units</span>
              <span className="text-lg md:text-xl font-bold text-[#111418]">{totalUnits}</span>
            </div>
            <div className="w-px h-8 md:h-10 bg-gray-200"></div>
            
            {/* Class Display - Only visible on md+ screens to save space on mobile, or stacked */}
            <div className="hidden md:flex flex-col items-end">
               <span className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide">Class of Degree</span>
               <span className={`text-base font-bold ${
                 degreeClass.includes('First') ? 'text-green-600' : 
                 degreeClass.includes('Upper') ? 'text-blue-600' : 'text-gray-800'
               }`}>
                 {degreeClass}
               </span>
            </div>
            <div className="w-px h-8 md:h-10 bg-gray-200 hidden md:block"></div>

            <div className="flex flex-col md:items-end">
              <span className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide">Current CGPA</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl md:text-3xl font-bold text-primary">{cgpa.toFixed(2)}</span>
                <span className="text-xs md:text-sm font-medium text-gray-400">/ {scale}</span>
              </div>
              {/* Mobile Only Class Display */}
              <span className="md:hidden text-xs font-semibold text-gray-600 mt-1">{degreeClass}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

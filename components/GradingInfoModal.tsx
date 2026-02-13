import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, GraduationCap } from 'lucide-react';
import { GRADE_OPTIONS } from '../constants';

interface GradingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GradingInfoModal: React.FC<GradingInfoModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'5.0' | '4.0'>('5.0');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="bg-white dark:bg-gray-800 w-full sm:rounded-2xl sm:max-w-md sm:mx-4 rounded-t-2xl shadow-xl relative z-10 flex flex-col max-h-[85vh] transition-colors overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <GraduationCap size={18} />
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Grading System</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-6">

            {/* Grade Points Chart */}
            <section>
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Grade Points</h3>
              <div className="grid grid-cols-6 gap-2">
                {GRADE_OPTIONS.map((opt) => (
                  <div key={opt.letter} className="flex flex-col items-center bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 border border-gray-100 dark:border-gray-700">
                    <span className={`text-lg font-black mb-1 ${opt.letter === 'A' ? 'text-emerald-500' :
                      opt.letter === 'B' ? 'text-blue-500' :
                        opt.letter === 'C' ? 'text-amber-500' :
                          opt.letter === 'F' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                      }`}>{opt.letter}</span>
                    <div className="flex flex-col items-center gap-0.5 w-full">
                      <span className="text-[10px] uppercase text-gray-400 font-bold">5.0</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{opt.value5}</span>
                    </div>
                    <div className="w-full h-px bg-gray-200 dark:bg-gray-600 my-1"></div>
                    <div className="flex flex-col items-center gap-0.5 w-full">
                      <span className="text-[10px] uppercase text-gray-400 font-bold">4.0</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{opt.value4}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Classification */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Degree Class</h3>
                <div className="flex bg-gray-100 dark:bg-gray-700/50 p-0.5 rounded-lg">
                  <button
                    onClick={() => setActiveTab('5.0')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${activeTab === '5.0' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500'}`}
                  >
                    5.0 Scale
                  </button>
                  <button
                    onClick={() => setActiveTab('4.0')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${activeTab === '4.0' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500'}`}
                  >
                    4.0 Scale
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {(activeTab === '5.0' ? [
                  ['4.50 – 5.00', 'First Class', 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'],
                  ['3.50 – 4.49', '2nd Class Upper', 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30'],
                  ['2.40 – 3.49', '2nd Class Lower', 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'],
                  ['1.50 – 2.39', 'Third Class', 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900/30'],
                  ['1.00 – 1.49', 'Pass', 'bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-800/50 dark:text-gray-500 dark:border-gray-700'],
                  ['0.00 – 0.99', 'Fail', 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'],
                ] : [
                  ['3.50 – 4.00', 'First Class', 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'],
                  ['3.00 – 3.49', '2nd Class Upper', 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30'],
                  ['2.00 – 2.99', '2nd Class Lower', 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'],
                  ['1.00 – 1.99', 'Third Class', 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900/30'],
                  ['0.00 – 0.99', 'Fail', 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'],
                ]).map(([range, cls, style]) => (
                  <div key={range} className={`flex items-center justify-between p-3 rounded-lg border ${style}`}>
                    <span className="font-bold text-sm">{cls}</span>
                    <span className="font-mono font-semibold text-xs opacity-80 bg-white/50 dark:bg-black/20 px-2 py-1 rounded">{range}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradingInfoModal;
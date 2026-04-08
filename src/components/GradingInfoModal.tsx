import React, { useState, useEffect } from 'react';
import { Info, Sparkles, X } from 'lucide-react';
import { GRADE_OPTIONS } from '../constants';

const GradingInfoModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'5.0' | '4.0'>('5.0');

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenHelpWidget');
    if (!hasSeen) {
      setTimeout(() => {
        setIsOpen(true);
      }, 1500);
    }
  }, []);

  const toggleWidget = () => {
    if (!isOpen) {
      localStorage.setItem('hasSeenHelpWidget', 'true');
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile backdrop for easy dismissal */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 sm:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Sliding Side Panel */}
      <div 
        className={`fixed bottom-[90px] right-0 z-50 flex items-end transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-x-0 shadow-[-10px_20px_40px_-10px_rgba(0,0,0,0.15)]' : 'translate-x-full'}`}
      >
        {/* Minimal Toggle Tab on the edge */}
        <button 
          onClick={toggleWidget}
          title="Grading Guide & Help"
          className="absolute -left-10 bottom-6 w-10 h-12 bg-white dark:bg-[#1a1a24] border border-gray-200 dark:border-gray-800 border-r-0 rounded-l-xl shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors z-50"
        >
          <Info size={18} className={isOpen ? 'text-gray-900 dark:text-white' : ''} />
        </button>

        {/* Panel Body */}
        <div 
          className="w-[85vw] sm:w-[320px] max-h-[60vh] bg-white dark:bg-[#1a1a24] border border-gray-200 dark:border-gray-800 border-r-0 rounded-l-2xl flex flex-col overflow-hidden"
        >
          {/* Header - Gray shaded background, consistent with SettingsModal */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111118]">
             <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Grading System</h2>
             <button onClick={() => setIsOpen(false)} aria-label="Close grading system guide" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 transition-colors sm:hidden">
               <X size={18} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7 no-scrollbar pb-24">
             {/* Section 1: Quick Guide */}
             <section className="bg-gray-50 dark:bg-[#111118] border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles size={14} className="text-gray-500 dark:text-gray-400" />
                  Quick Guide
                </h3>
                <ul className="text-[11px] text-gray-600 dark:text-gray-400 space-y-3 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <div className="size-1 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5 shrink-0" />
                    <span><strong>Add Semesters:</strong> Scroll to the Add Semester button to begin adding sessions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="size-1 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5 shrink-0" />
                    <span><strong>AI Scanner:</strong> Tap the Scan icon to snapshot a result sheet. The AI will extract all courses natively!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="size-1 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5 shrink-0" />
                    <span><strong>Configure:</strong> Open Settings to switch between a 5.0 and 4.0 scale or adjust Grade points.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="size-1 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5 shrink-0" />
                    <span><strong>Export PDF:</strong> Tap the PDF icon to effortlessly generate a beautiful Scholar Report.</span>
                  </li>
                </ul>
              </section>

              {/* Grade Points Chart */}
              <section>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">Grade Points <span className="h-px bg-gray-100 dark:bg-gray-800 flex-1"></span></h3>
                <div className="grid grid-cols-6 gap-1.5">
                  {GRADE_OPTIONS.map((opt) => (
                    <div key={opt.letter} className="flex flex-col items-center bg-gray-50 dark:bg-[#111118] rounded-lg p-1.5 border border-gray-100 dark:border-gray-800">
                      <span className="text-base font-black mb-1 text-gray-800 dark:text-gray-200">{opt.letter}</span>
                      <div className="flex flex-col items-center gap-0.5 w-full">
                        <span className="text-[9px] uppercase text-gray-500 dark:text-gray-500 font-bold">5.0</span>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{opt.value5}</span>
                      </div>
                      <div className="w-full h-px bg-gray-200 dark:bg-gray-700/50 my-1"></div>
                      <div className="flex flex-col items-center gap-0.5 w-full">
                        <span className="text-[9px] uppercase text-gray-500 dark:text-gray-500 font-bold">4.0</span>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{opt.value4}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Classification */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Degree Class</h3>
                  <div className="flex bg-gray-50 dark:bg-gray-800/50 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700/50">
                    <button
                      onClick={() => setActiveTab('5.0')}
                      className={`px-3 py-0.5 text-[10px] font-bold rounded-md transition-all ${activeTab === '5.0' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-500'}`}
                    >
                      5.0 Scale
                    </button>
                    <button
                      onClick={() => setActiveTab('4.0')}
                      className={`px-3 py-0.5 text-[10px] font-bold rounded-md transition-all ${activeTab === '4.0' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-500'}`}
                    >
                      4.0 Scale
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {(activeTab === '5.0' ? [
                    ['4.50 – 5.00', 'First Class', 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'],
                    ['3.50 – 4.49', '2nd Class Upper', 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-900/30'],
                    ['2.40 – 3.49', '2nd Class Lower', 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'],
                    ['1.50 – 2.39', 'Third Class', 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30'],
                    ['1.00 – 1.49', 'Pass', 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30'],
                    ['0.00 – 0.99', 'Fail', 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'],
                  ] : [
                    ['3.50 – 4.00', 'First Class', 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'],
                    ['3.00 – 3.49', '2nd Class Upper', 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-900/30'],
                    ['2.00 – 2.99', '2nd Class Lower', 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'],
                    ['1.00 – 1.99', 'Third Class', 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30'],
                    ['0.00 – 0.99', 'Fail', 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'],
                  ]).map(([range, cls, style]) => (
                    <div key={range} className={`flex items-center justify-between p-2.5 rounded-lg border ${style}`}>
                      <span className="font-bold text-[11px]">{cls}</span>
                      <span className="font-mono font-semibold text-[10px] opacity-80 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded">{range}</span>
                    </div>
                  ))}
                </div>
              </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default GradingInfoModal;
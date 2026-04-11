import React, { useState } from 'react';
import { Info, X, BookOpen, Cpu, FileDown, Settings } from 'lucide-react';
import { GRADE_OPTIONS } from '../constants';

const GradingInfoModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'5.0' | '4.0'>('5.0');

  // No auto-popup — users open this manually via the side button
  const toggleWidget = () => setIsOpen(prev => !prev);

  const DEGREE_CLASSES = {
    '5.0': [
      ['4.50 – 5.00', 'First Class',      'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30'],
      ['3.50 – 4.49', '2nd Class Upper',   'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-900/30'],
      ['2.40 – 3.49', '2nd Class Lower',   'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'],
      ['1.50 – 2.39', 'Third Class',       'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30'],
      ['1.00 – 1.49', 'Pass',              'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30'],
      ['0.00 – 0.99', 'Fail',              'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'],
    ],
    '4.0': [
      ['3.50 – 4.00', 'First Class',      'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30'],
      ['3.00 – 3.49', '2nd Class Upper',  'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-900/30'],
      ['2.00 – 2.99', '2nd Class Lower',  'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'],
      ['1.00 – 1.99', 'Third Class',      'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30'],
      ['0.00 – 0.99', 'Fail',             'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'],
    ],
  };

  const tips = [
    { icon: BookOpen, text: 'Scroll down within a semester to hit **Add Course** and log your results.' },
    { icon: Cpu,      text: 'Tap the **Scan** icon in the header to let AI read your result sheet automatically.' },
    { icon: Settings, text: 'Use **Settings** to switch scale (5.0 / 4.0), adjust score ranges, or enable a **cool animated gradient** background.' },
    { icon: FileDown, text: 'Tap the **PDF** icon to export a beautifully formatted Scholar Report.' },
  ];

  return (
    <>
      {/* Backdrop (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side FAB — left edge, vertically centred so it never overlaps the footer */}
      <button
        onClick={toggleWidget}
        title="Grading Guide & Help"
        aria-label="Open grading guide"
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-7 h-16 rounded-r-xl shadow-lg transition-all duration-300 border-y border-r ${
          isOpen
            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
            : 'bg-white dark:bg-[#1a1a24] text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        {isOpen ? <X size={13} /> : <Info size={13} />}
      </button>

      {/* Panel — opens to the right of the FAB on desktop, from left on mobile */}
      <div
        className={`fixed left-8 top-1/2 -translate-y-1/2 z-50 w-[calc(100vw-4rem)] sm:w-[340px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isOpen ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-4 pointer-events-none'}`}
      >
        <div className="bg-white dark:bg-[#1a1a24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden max-h-[70vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Grading Guide</h2>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close grading guide"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

            {/* Quick tips */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Quick Tips</p>
              <div className="space-y-2">
                {tips.map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                    <div className="shrink-0 mt-0.5 size-6 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600">
                      <Icon size={13} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                      {text.split('**').map((part, j) =>
                        j % 2 === 1
                          ? <strong key={j} className="text-gray-700 dark:text-gray-300 font-semibold">{part}</strong>
                          : part
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Grade Points */}
            <section>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Grade Points</p>
              <div className="grid grid-cols-6 gap-1.5">
                {GRADE_OPTIONS.map((opt) => (
                  <div key={opt.letter} className="flex flex-col items-center bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2 border border-gray-100 dark:border-gray-700/50">
                    <span className="text-sm font-black mb-1.5 text-gray-800 dark:text-gray-200">{opt.letter}</span>
                    <div className="flex flex-col items-center gap-0.5 w-full">
                      <span className="text-[8px] uppercase text-gray-400 dark:text-gray-500 font-bold leading-none">5.0</span>
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{opt.value5}</span>
                    </div>
                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1.5" />
                    <div className="flex flex-col items-center gap-0.5 w-full">
                      <span className="text-[8px] uppercase text-gray-400 dark:text-gray-500 font-bold leading-none">4.0</span>
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{opt.value4}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Degree Classification */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Degree Class</p>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                  {(['5.0', '4.0'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        activeTab === tab
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                {DEGREE_CLASSES[activeTab].map(([range, cls, style]) => (
                  <div key={range} className={`flex items-center justify-between p-2.5 rounded-xl border ${style}`}>
                    <span className="font-bold text-[11px]">{cls}</span>
                    <span className="font-mono font-semibold text-[10px] opacity-75 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-md">{range}</span>
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
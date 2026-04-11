import React from 'react';
import { MedYear, MedSubject } from '../types';

interface MedFooterProps {
    medData: MedYear[];
}

const getResult = (sub: MedSubject): 'distinction' | 'pass' | 'fail' | 'pending' => {
    if (sub.ca === '' || sub.exam === '') return 'pending';
    const total = (sub.ca as number) + (sub.exam as number);
    if (total >= 70) return 'distinction';
    if (total >= 50) return 'pass';
    return 'fail';
};

const MedFooter: React.FC<MedFooterProps> = ({ medData }) => {
    let totalEntered = 0;
    let totalPassed = 0;
    let totalDistinctions = 0;
    let sumScores = 0;
    let totalFailed = 0;

    for (const year of medData) {
        for (const sub of year.subjects) {
            const result = getResult(sub);
            if (result !== 'pending') {
                const total = (sub.ca as number) + (sub.exam as number);
                totalEntered++;
                sumScores += total;
                if (result === 'distinction') { totalDistinctions++; totalPassed++; }
                else if (result === 'pass') totalPassed++;
                else totalFailed++;
            }
        }
    }

    const avg = totalEntered > 0 ? sumScores / totalEntered : 0;
    const hasData = totalEntered > 0;
    const statusText = !hasData ? 'No scores yet' : totalFailed > 0 ? 'At Risk' : 'On Track';
    const statusColor = !hasData
        ? 'text-gray-400 dark:text-gray-500'
        : totalFailed > 0
        ? 'text-red-500 dark:text-red-400'
        : 'text-emerald-600 dark:text-emerald-400';

    return (
        <footer className="flex-none fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#1a1a24]/95 backdrop-blur-md border-t border-gray-100/80 dark:border-gray-700/40 z-30 transition-colors">
            <div className="max-w-[960px] mx-auto px-4 py-3">

                {/* Mobile */}
                <div className="sm:hidden flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide">Passed</span>
                            <span className="text-sm font-black text-gray-700 dark:text-gray-300 leading-none mt-0.5">
                                {hasData ? `${totalPassed} / ${totalEntered}` : '—'}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide">Distinctions</span>
                            <span className="text-sm font-black text-gray-700 dark:text-gray-300 leading-none mt-0.5">
                                {hasData ? totalDistinctions : '—'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-end justify-between border-t border-gray-100 dark:border-gray-700/50 pt-2.5">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide mb-1">Status</span>
                            <span className={`text-xs font-bold ${statusColor}`}>{statusText}</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide mb-0.5">Overall Average</span>
                            <div className="flex items-baseline gap-0.5">
                                <span className={`text-2xl font-black transition-colors leading-none tracking-tight ${hasData ? statusColor : 'text-gray-400 dark:text-gray-500'}`}>
                                    {hasData ? avg.toFixed(1) : '—'}
                                </span>
                                {hasData && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold ml-0.5">/ 100</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop */}
                <div className="hidden sm:flex items-center justify-between">
                    <div className="flex items-center">
                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Medicine &amp; Surgery</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase block">Passed</span>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                {hasData ? `${totalPassed} / ${totalEntered}` : '—'}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase block">Distinctions</span>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                {hasData ? totalDistinctions : '—'}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase block">Status</span>
                            <span className={`text-xs font-bold transition-colors ${statusColor}`}>{statusText}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase block">Average</span>
                            <div className="flex items-baseline gap-0.5">
                                <span className={`text-2xl font-extrabold transition-colors leading-none ${hasData ? statusColor : 'text-gray-400 dark:text-gray-500'}`}>
                                    {hasData ? avg.toFixed(1) : '—'}
                                </span>
                                {hasData && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">/ 100</span>}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default MedFooter;

import React, { useState, useEffect } from 'react';
import { Plus, X, Pencil } from 'lucide-react';
import { MedYear, MedSubject } from '../types';
import { generateId } from '../utils';
import ConfirmationModal from './ConfirmationModal';
import MedFooter from './MedFooter';

// ─── Constants ────────────────────────────────────────────────────────────────

const PASS_MARK = 50;
const DISTINCTION_MARK = 70;
const CA_MAX = 30;
const EXAM_MAX = 70;

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultType = 'distinction' | 'pass' | 'fail' | 'pending';

interface ConfirmConfig {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTotal = (sub: MedSubject): number | null => {
    if (sub.ca === '' || sub.exam === '') return null;
    return (sub.ca as number) + (sub.exam as number);
};

const getResult = (sub: MedSubject): ResultType => {
    const total = getTotal(sub);
    if (total === null) return 'pending';
    if (total >= DISTINCTION_MARK) return 'distinction';
    if (total >= PASS_MARK) return 'pass';
    return 'fail';
};

const RESULT_LABEL: Record<ResultType, string> = {
    distinction: 'Distinction',
    pass: 'Pass',
    fail: 'Fail',
    pending: '—',
};

const RESULT_CLASS: Record<ResultType, string> = {
    distinction: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    pass:        'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
    fail:        'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    pending:     'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500',
};

const TOTAL_TEXT_CLASS: Record<ResultType, string> = {
    distinction: 'text-emerald-600 dark:text-emerald-400',
    pass:        'text-sky-600 dark:text-sky-400',
    fail:        'text-red-600 dark:text-red-400',
    pending:     'text-gray-300 dark:text-gray-600',
};

// ─── Initial Data ─────────────────────────────────────────────────────────────

const ms = (name: string): MedSubject => ({
    id: `ms-${Math.random().toString(36).substr(2, 9)}`,
    name,
    ca: '',
    exam: '',
});

const getInitialMedData = (): MedYear[] => [
    {
        id: 'med-y1',
        name: 'Pre-Clinical Year 1',
        examName: '1st MBBS',
        subjects: ['Anatomy', 'Physiology', 'Biochemistry'].map(ms),
    },
    {
        id: 'med-y2',
        name: 'Pre-Clinical Year 2',
        examName: '2nd MBBS',
        subjects: ['Pathology', 'Pharmacology', 'Microbiology', 'Haematology'].map(ms),
    },
    {
        id: 'med-y3',
        name: 'Clinical Year 3',
        examName: '3rd MBBS (Pt. 1)',
        subjects: ['Medicine', 'Surgery', 'Obs & Gynae', 'Paediatrics'].map(ms),
    },
    {
        id: 'med-y4',
        name: 'Clinical Year 4',
        examName: '3rd MBBS (Pt. 2)',
        subjects: ['Community Health', 'Ophthalmology', 'ENT', 'Psychiatry'].map(ms),
    },
    {
        id: 'med-y5',
        name: 'Clinical Year 5',
        examName: 'Final MBBS',
        subjects: ['Medicine', 'Surgery'].map(ms),
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

const MedicalApp: React.FC = () => {

    // ── State ─────────────────────────────────────────────────────────────────

    const [medData, setMedData] = useState<MedYear[]>(() => {
        try {
            const saved = localStorage.getItem('med_data');
            return saved ? JSON.parse(saved) : getInitialMedData();
        } catch { return getInitialMedData(); }
    });

    const [activeYearId, setActiveYearId] = useState<string>(() => {
        try {
            const saved = localStorage.getItem('med_data');
            if (saved) return JSON.parse(saved)[0]?.id ?? 'med-y1';
        } catch {}
        return 'med-y1';
    });

    // Inline editing — all share a single draft string (only one edits at a time)
    const [editYearNameId, setEditYearNameId] = useState<string | null>(null);
    const [editExamNameId, setEditExamNameId] = useState<string | null>(null);
    const [editSubjectId, setEditSubjectId]   = useState<string | null>(null);
    const [draft, setDraft] = useState('');

    const [confirm, setConfirm] = useState<ConfirmConfig>({
        isOpen: false, title: '', message: '', onConfirm: () => {},
    });

    // ── Persistence ───────────────────────────────────────────────────────────

    useEffect(() => {
        localStorage.setItem('med_data', JSON.stringify(medData));
    }, [medData]);

    // Make sure active year is always valid
    useEffect(() => {
        if (!medData.find(y => y.id === activeYearId) && medData.length > 0) {
            setActiveYearId(medData[0].id);
        }
    }, [medData, activeYearId]);

    const activeYear = medData.find(y => y.id === activeYearId) ?? medData[0];

    // ── Confirm helper ────────────────────────────────────────────────────────

    const ask = (cfg: Omit<ConfirmConfig, 'isOpen'>) => {
        setConfirm({ ...cfg, isOpen: true });
    };

    // ── Subject actions ───────────────────────────────────────────────────────

    const updateSubject = (
        yearId: string,
        subjectId: string,
        field: keyof MedSubject,
        value: string | number | '',
    ) => {
        setMedData(prev => prev.map(year =>
            year.id !== yearId ? year : {
                ...year,
                subjects: year.subjects.map(sub =>
                    sub.id !== subjectId ? sub : { ...sub, [field]: value }
                ),
            }
        ));
    };

    const handleScoreChange = (
        yearId: string,
        subjectId: string,
        field: 'ca' | 'exam',
        raw: string,
        max: number,
    ) => {
        if (raw === '') { updateSubject(yearId, subjectId, field, ''); return; }
        let num = parseFloat(raw);
        if (isNaN(num)) return;
        num = Math.min(max, Math.max(0, num));
        updateSubject(yearId, subjectId, field, num);
    };

    const addSubject = (yearId: string) => {
        setMedData(prev => prev.map(year =>
            year.id !== yearId ? year : {
                ...year,
                subjects: [...year.subjects, ms('')],
            }
        ));
        // Focus the new subject name field after render
        setTimeout(() => {
            const newSubject = medData.find(y => y.id === yearId)?.subjects.at(-1);
            if (newSubject) {
                setEditSubjectId(newSubject.id + '-pending'); // triggers focus on next render
            }
        }, 50);
    };

    const deleteSubject = (yearId: string, subjectId: string) => {
        const year = medData.find(y => y.id === yearId);
        if (!year) return;
        if (year.subjects.length <= 1) {
            ask({ title: 'Cannot Delete', message: 'A year must have at least one subject.', confirmLabel: 'Got it', isDestructive: false, onConfirm: () => {} });
            return;
        }
        ask({
            title: 'Remove Subject',
            message: 'Remove this subject and all its scores?',
            confirmLabel: 'Remove',
            isDestructive: true,
            onConfirm: () => setMedData(prev => prev.map(y =>
                y.id !== yearId ? y : { ...y, subjects: y.subjects.filter(s => s.id !== subjectId) }
            )),
        });
    };

    // ── Year actions ──────────────────────────────────────────────────────────

    const ordinalSuffix = (n: number) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
    };

    const addYear = () => {
        const n = medData.length + 1;
        const newYear: MedYear = {
            id: generateId(),
            name: `Year ${n}`,
            examName: `${ordinalSuffix(n)} MBBS`,
            subjects: [ms('Subject 1'), ms('Subject 2')],
        };
        setMedData(prev => [...prev, newYear]);
        setActiveYearId(newYear.id);
    };

    const deleteYear = (yearId: string) => {
        const idx = medData.findIndex(y => y.id === yearId);
        if (idx === 0) {
            ask({ title: 'Cannot Delete', message: 'The first year cannot be deleted.', confirmLabel: 'Got it', isDestructive: false, onConfirm: () => {} });
            return;
        }
        ask({
            title: 'Delete Year',
            message: 'Delete this year and all its subjects and scores? This cannot be undone.',
            confirmLabel: 'Delete Year',
            isDestructive: true,
            onConfirm: () => {
                const filtered = medData.filter(y => y.id !== yearId);
                setMedData(filtered);
                if (yearId === activeYearId) {
                    setActiveYearId(filtered[Math.min(idx, filtered.length - 1)].id);
                }
            },
        });
    };

    const updateYearField = (yearId: string, field: 'name' | 'examName', value: string) => {
        setMedData(prev => prev.map(y =>
            y.id !== yearId ? y : { ...y, [field]: value }
        ));
    };

    // ── Inline edit commit helpers ─────────────────────────────────────────────

    const commitYearName = (yearId: string) => {
        if (draft.trim()) updateYearField(yearId, 'name', draft.trim());
        setEditYearNameId(null);
    };

    const commitExamName = (yearId: string) => {
        if (draft.trim()) updateYearField(yearId, 'examName', draft.trim());
        setEditExamNameId(null);
    };

    const commitSubjectName = (yearId: string, subjectId: string) => {
        updateSubject(yearId, subjectId, 'name', draft);
        setEditSubjectId(null);
    };

    // ── Year-level stats ──────────────────────────────────────────────────────

    const getYearStats = (year: MedYear) => {
        let entered = 0, passed = 0, failed = 0, distinctions = 0;
        for (const sub of year.subjects) {
            const r = getResult(sub);
            if (r !== 'pending') {
                entered++;
                if      (r === 'distinction') { distinctions++; passed++; }
                else if (r === 'pass')        passed++;
                else                          failed++;
            }
        }
        return { total: year.subjects.length, entered, passed, failed, distinctions };
    };

    // ── Guard ─────────────────────────────────────────────────────────────────

    if (!activeYear) return null;

    const ys = getYearStats(activeYear);
    const yearAllPassed  = ys.entered > 0 && ys.failed === 0 && ys.entered === ys.total;
    const yearAtRisk     = ys.failed > 0;

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <>
            {/* ── Year Tabs ─────────────────────────────────────────────── */}
            <div className="sticky top-0 bg-white/20 dark:bg-[#1a1a24]/20 backdrop-blur-xl px-1 sm:px-6 pt-2.5 pb-3 z-20 transition-colors">
                <div className="max-w-[960px] mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar px-2 sm:px-0 py-0.5">
                    {medData.map((year, index) => (
                        <button
                            key={year.id}
                            onClick={() => setActiveYearId(year.id)}
                            className={`group relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                activeYearId === year.id
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            {year.examName}
                            {medData.length > 1 && index !== 0 && (
                                <span
                                    onClick={e => { e.stopPropagation(); deleteYear(year.id); }}
                                    className={`ml-0.5 rounded-full transition-colors cursor-pointer ${
                                        activeYearId === year.id
                                            ? 'text-gray-400 hover:text-white'
                                            : 'text-gray-400 dark:text-gray-500 hover:text-red-500'
                                    }`}
                                >
                                    <X size={12} />
                                </span>
                            )}
                        </button>
                    ))}
                    <button
                        onClick={addYear}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-white/60 dark:bg-[#1a1a24]/60 backdrop-blur-sm shadow-sm whitespace-nowrap transition-all"
                    >
                        <Plus size={12} />
                        Add Year
                    </button>
                </div>
            </div>

            {/* ── Main Content ──────────────────────────────────────────── */}
            <div className="max-w-[960px] mx-auto w-full px-4 sm:px-6 pb-36 pt-4">

                {/* Year + Exam Name (editable) */}
                <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {/* Year Name */}
                    {editYearNameId === activeYear.id ? (
                        <input
                            autoFocus
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onBlur={() => commitYearName(activeYear.id)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') commitYearName(activeYear.id);
                                if (e.key === 'Escape') setEditYearNameId(null);
                            }}
                            className="text-base font-bold bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5 text-gray-900 dark:text-gray-100 outline-none border border-gray-300 dark:border-gray-600 max-w-[220px]"
                        />
                    ) : (
                        <button
                            onClick={() => { setEditYearNameId(activeYear.id); setDraft(activeYear.name); }}
                            className="flex items-center gap-1 text-base font-bold text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors group/yn"
                        >
                            {activeYear.name}
                            <Pencil size={12} className="opacity-0 group-hover/yn:opacity-50 transition-opacity" />
                        </button>
                    )}

                    <span className="text-gray-300 dark:text-gray-600 text-sm select-none">·</span>

                    {/* Exam Name */}
                    {editExamNameId === activeYear.id ? (
                        <input
                            autoFocus
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onBlur={() => commitExamName(activeYear.id)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') commitExamName(activeYear.id);
                                if (e.key === 'Escape') setEditExamNameId(null);
                            }}
                            className="text-sm bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5 text-gray-500 dark:text-gray-400 outline-none border border-gray-300 dark:border-gray-600 max-w-[180px]"
                        />
                    ) : (
                        <button
                            onClick={() => { setEditExamNameId(activeYear.id); setDraft(activeYear.examName); }}
                            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group/en"
                        >
                            {activeYear.examName}
                            <Pencil size={11} className="opacity-0 group-hover/en:opacity-50 transition-opacity" />
                        </button>
                    )}
                </div>

                {/* Year Status Banner */}
                <div className={`mb-4 px-3 py-2 rounded-lg flex items-center justify-between text-xs ${
                    ys.entered === 0
                        ? 'bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/40'
                        : yearAtRisk
                        ? 'bg-red-50/80 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/40'
                        : yearAllPassed
                        ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-800/40'
                        : 'bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/40'
                }`}>
                    <span className={`font-medium ${
                        ys.entered === 0   ? 'text-gray-500 dark:text-gray-400'
                        : yearAtRisk       ? 'text-red-700 dark:text-red-400'
                        : yearAllPassed    ? 'text-emerald-700 dark:text-emerald-400'
                        :                   'text-amber-700 dark:text-amber-400'
                    }`}>
                        {ys.entered === 0
                            ? 'No scores entered yet — fill in CA and exam scores below'
                            : yearAtRisk
                            ? `${ys.failed} subject${ys.failed > 1 ? 's' : ''} failed — resit required`
                            : yearAllPassed
                            ? `All ${ys.total} subjects passed`
                            : `${ys.entered} of ${ys.total} subjects entered`
                        }
                    </span>
                    {ys.entered > 0 && (
                        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                            {ys.distinctions > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {ys.distinctions} Distinction{ys.distinctions > 1 ? 's' : ''}
                                </span>
                            )}
                            <span>{ys.passed}/{ys.total} Passed</span>
                        </div>
                    )}
                </div>

                {/* ── Subject Table ─────────────────────────────────────── */}
                <div className="bg-white dark:bg-[#1a1a24]/80 rounded-xl border border-gray-100 dark:border-gray-700/40 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <div style={{ minWidth: '460px' }}>

                            {/* Header Row */}
                            <div className="grid grid-cols-[1fr_76px_76px_66px_92px_30px] gap-0 border-b border-gray-100 dark:border-gray-700/40 px-4 py-2.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Subject</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-center">CA /30</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-center">Exam /70</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-center">Total</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-center">Result</span>
                                <span />
                            </div>

                            {/* Subject Rows */}
                            {activeYear.subjects.map((sub, idx) => {
                                const result  = getResult(sub);
                                const total   = getTotal(sub);
                                const isLast  = idx === activeYear.subjects.length - 1;
                                const isEditing = editSubjectId === sub.id;

                                return (
                                    <div
                                        key={sub.id}
                                        className={`grid grid-cols-[1fr_76px_76px_66px_92px_30px] gap-0 px-4 py-2.5 items-center transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02] group ${
                                            !isLast ? 'border-b border-gray-50 dark:border-gray-800/60' : ''
                                        }`}
                                    >
                                        {/* Subject Name */}
                                        <div className="pr-2 min-w-0">
                                            {isEditing ? (
                                                <input
                                                    autoFocus
                                                    value={draft}
                                                    onChange={e => setDraft(e.target.value)}
                                                    onBlur={() => commitSubjectName(activeYear.id, sub.id)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') commitSubjectName(activeYear.id, sub.id);
                                                        if (e.key === 'Escape') setEditSubjectId(null);
                                                    }}
                                                    placeholder="Subject name"
                                                    className="w-full text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5 outline-none border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => { setEditSubjectId(sub.id); setDraft(sub.name); }}
                                                    className="text-sm font-medium text-gray-800 dark:text-gray-200 text-left w-full flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors group/sn"
                                                >
                                                    <span className="truncate">
                                                        {sub.name || <span className="text-gray-400 dark:text-gray-500 italic text-xs">Unnamed</span>}
                                                    </span>
                                                    <Pencil size={10} className="flex-shrink-0 opacity-0 group-hover/sn:opacity-40 transition-opacity" />
                                                </button>
                                            )}
                                        </div>

                                        {/* CA Score Input */}
                                        <div className="flex justify-center">
                                            <input
                                                type="number"
                                                min={0}
                                                max={CA_MAX}
                                                step={0.5}
                                                value={sub.ca === '' ? '' : sub.ca}
                                                onChange={e => handleScoreChange(activeYear.id, sub.id, 'ca', e.target.value, CA_MAX)}
                                                placeholder="—"
                                                className="w-14 text-center text-sm font-medium bg-gray-50 dark:bg-gray-800/60 rounded-md px-1 py-1 text-gray-800 dark:text-gray-200 outline-none border border-transparent focus:border-gray-300 dark:focus:border-gray-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>

                                        {/* Exam Score Input */}
                                        <div className="flex justify-center">
                                            <input
                                                type="number"
                                                min={0}
                                                max={EXAM_MAX}
                                                step={0.5}
                                                value={sub.exam === '' ? '' : sub.exam}
                                                onChange={e => handleScoreChange(activeYear.id, sub.id, 'exam', e.target.value, EXAM_MAX)}
                                                placeholder="—"
                                                className="w-14 text-center text-sm font-medium bg-gray-50 dark:bg-gray-800/60 rounded-md px-1 py-1 text-gray-800 dark:text-gray-200 outline-none border border-transparent focus:border-gray-300 dark:focus:border-gray-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>

                                        {/* Total (read-only, computed) */}
                                        <div className="text-center">
                                            <span className={`text-sm font-bold tabular-nums ${TOTAL_TEXT_CLASS[result]}`}>
                                                {total === null
                                                    ? '—'
                                                    : Number.isInteger(total) ? total : total.toFixed(1)
                                                }
                                            </span>
                                        </div>

                                        {/* Result Badge */}
                                        <div className="flex justify-center">
                                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${RESULT_CLASS[result]}`}>
                                                {RESULT_LABEL[result]}
                                            </span>
                                        </div>

                                        {/* Delete Subject */}
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => deleteSubject(activeYear.id, sub.id)}
                                                title="Remove subject"
                                                className="size-6 flex items-center justify-center rounded text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add Subject Row */}
                            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/40">
                                <button
                                    onClick={() => addSubject(activeYear.id)}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    <Plus size={13} />
                                    Add Subject
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Legend */}
                <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 text-center">
                    CA out of 30 &middot; Exam out of 70 &middot; Pass at 50 / 100 &middot; Distinction at 70 / 100
                </p>

            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirm.isOpen}
                onClose={() => setConfirm(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirm.onConfirm}
                title={confirm.title}
                message={confirm.message}
                confirmLabel={confirm.confirmLabel}
                isDestructive={confirm.isDestructive}
            />

            {/* Medical Footer */}
            <MedFooter medData={medData} />
        </>
    );
};

export default MedicalApp;

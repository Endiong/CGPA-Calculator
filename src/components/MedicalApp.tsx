import React, { useState, useEffect } from 'react';
import { Plus, X, Pencil, Calculator } from 'lucide-react';
import { MedYear, MedSubject } from '../types';
import { generateId } from '../utils';
import ConfirmationModal from './ConfirmationModal';
import MedFooter from './MedFooter';
import MedScannerModal from './MedScannerModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const DISTINCTION_MARK = 70;
const CREDIT_MARK      = 60;
const PASS_MARK        = 50;
const BORDERLINE_MARK  = 40;
const CA_MAX           = 30;
const EXAM_MAX         = 70;

// ─── Local Types ──────────────────────────────────────────────────────────────

type ResultType = 'distinction' | 'credit' | 'pass' | 'borderline' | 'fail' | 'pending';

interface CumsEntry {
    id: string;
    label: string;
    score: number | '';
}

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
    if (total === null)            return 'pending';
    if (total >= DISTINCTION_MARK) return 'distinction';
    if (total >= CREDIT_MARK)      return 'credit';
    if (total >= PASS_MARK)        return 'pass';
    if (total >= BORDERLINE_MARK)  return 'borderline';
    return 'fail';
};

const RESULT_LABEL: Record<ResultType, string> = {
    distinction: 'Distinction',
    credit:      'Credit',
    pass:        'Pass',
    borderline:  'Borderline',
    fail:        'Fail',
    pending:     '—',
};

const RESULT_CLASS: Record<ResultType, string> = {
    distinction: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    credit:      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    pass:        'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
    borderline:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    fail:        'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    pending:     'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500',
};

const TOTAL_TEXT_CLASS: Record<ResultType, string> = {
    distinction: 'text-emerald-600 dark:text-emerald-400',
    credit:      'text-indigo-600 dark:text-indigo-400',
    pass:        'text-sky-600 dark:text-sky-400',
    borderline:  'text-amber-600 dark:text-amber-400',
    fail:        'text-red-600 dark:text-red-400',
    pending:     'text-gray-300 dark:text-gray-600',
};

// ─── CUMS Calculation ─────────────────────────────────────────────────────────

const calcCums = (entries: CumsEntry[]) => {
    const valid = entries.filter(e => e.score !== '' && !isNaN(Number(e.score)));
    if (valid.length === 0) return { mean: 0, cums: 0, count: 0 };
    const mean = valid.reduce((s, e) => s + (e.score as number), 0) / valid.length;
    const cums = Math.min(CA_MAX, parseFloat((mean * 0.3).toFixed(2)));
    return { mean: parseFloat(mean.toFixed(2)), cums, count: valid.length };
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

interface MedicalAppProps {
    scannerOpen?: boolean;
    onScannerClose?: () => void;
}

const MedicalApp: React.FC<MedicalAppProps> = ({ scannerOpen = false, onScannerClose }) => {

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

    // Scanner open/close is controlled by the parent (App.tsx header button)
    const [localScannerOpen, setLocalScannerOpen] = useState(false);
    const isScannerOpen = scannerOpen || localScannerOpen;
    const closeScannerAll = () => { onScannerClose?.(); setLocalScannerOpen(false); };

    // ── CUMS Calculator State ──────────────────────────────────────────────────

    const [cumsOpenId, setCumsOpenId]     = useState<string | null>(null);
    const [cumsEntriesMap, setCumsEntriesMap] = useState<Record<string, CumsEntry[]>>({});

    const getCumsEntries = (subId: string): CumsEntry[] =>
        cumsEntriesMap[subId] ?? [];

    const initCumsEntries = (subId: string) => {
        if (!cumsEntriesMap[subId]) {
            setCumsEntriesMap(prev => ({
                ...prev,
                [subId]: [{ id: generateId(), label: '', score: '' }],
            }));
        }
    };

    const addCumsEntry = (subId: string) => {
        setCumsEntriesMap(prev => ({
            ...prev,
            [subId]: [...(prev[subId] ?? []), { id: generateId(), label: '', score: '' }],
        }));
    };

    const updateCumsEntry = (
        subId: string,
        entryId: string,
        field: 'label' | 'score',
        value: string | number | '',
    ) => {
        setCumsEntriesMap(prev => ({
            ...prev,
            [subId]: (prev[subId] ?? []).map(e =>
                e.id === entryId ? { ...e, [field]: value } : e
            ),
        }));
    };

    const removeCumsEntry = (subId: string, entryId: string) => {
        setCumsEntriesMap(prev => ({
            ...prev,
            [subId]: (prev[subId] ?? []).filter(e => e.id !== entryId),
        }));
    };

    const applyCumsScore = (yearId: string, subId: string) => {
        const { cums } = calcCums(getCumsEntries(subId));
        updateSubject(yearId, subId, 'ca', cums);
        setCumsOpenId(null);
    };

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
        setTimeout(() => {
            const newSubject = medData.find(y => y.id === yearId)?.subjects.at(-1);
            if (newSubject) {
                setEditSubjectId(newSubject.id + '-pending');
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

    // ── Scanner import ────────────────────────────────────────────────────────

    const handleScanImport = (subjects: MedSubject[]) => {
        setMedData(prev => prev.map(year =>
            year.id !== activeYearId ? year : { ...year, subjects }
        ));
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
        let entered = 0, distinctions = 0, credits = 0, passed = 0, borderlines = 0, failed = 0;
        for (const sub of year.subjects) {
            const r = getResult(sub);
            if (r !== 'pending') {
                entered++;
                if      (r === 'distinction') { distinctions++; passed++; }
                else if (r === 'credit')      { credits++;      passed++; }
                else if (r === 'pass')         passed++;
                else if (r === 'borderline')   borderlines++;
                else                           failed++;
            }
        }
        return { total: year.subjects.length, entered, distinctions, credits, passed, borderlines, failed };
    };

    // ── Guard ─────────────────────────────────────────────────────────────────

    if (!activeYear) return null;

    const ys = getYearStats(activeYear);
    const allEntered     = ys.entered === ys.total && ys.total > 0;
    const yearPromoted   = allEntered && ys.failed === 0 && ys.borderlines === 0;
    const yearBorderline = ys.borderlines > 0 && ys.failed === 0;
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
            <div className="max-w-[960px] mx-auto w-full px-4 sm:px-6 pb-36 pt-4 relative z-10">

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

                {/* ── Year Status Banner ───────────────────────────────── */}
                <div className={`mb-4 px-3 py-2 rounded-lg flex items-center justify-between text-xs ${
                    ys.entered === 0
                        ? 'bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/40'
                        : yearAtRisk
                        ? 'bg-red-50/80 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/40'
                        : yearBorderline
                        ? 'bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/40'
                        : yearPromoted
                        ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-800/40'
                        : 'bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/40'
                }`}>
                    <span className={`font-medium ${
                        ys.entered === 0   ? 'text-gray-500 dark:text-gray-400'
                        : yearAtRisk       ? 'text-red-700 dark:text-red-400'
                        : yearBorderline   ? 'text-amber-700 dark:text-amber-400'
                        : yearPromoted     ? 'text-emerald-700 dark:text-emerald-400'
                        :                   'text-amber-700 dark:text-amber-400'
                    }`}>
                        {ys.entered === 0
                            ? 'No scores entered yet — fill in CA and exam scores below'
                            : yearAtRisk
                            ? `Resit Required — ${ys.failed} subject${ys.failed > 1 ? 's' : ''} failed`
                            : yearBorderline
                            ? `Supplementary — ${ys.borderlines} subject${ys.borderlines > 1 ? 's' : ''} borderline (40–49)`
                            : yearPromoted
                            ? `Promoted — All ${ys.total} subjects passed`
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
                            {ys.credits > 0 && (
                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                    {ys.credits} Credit{ys.credits > 1 ? 's' : ''}
                                </span>
                            )}
                            <span>{ys.passed}/{ys.total} Passed</span>
                        </div>
                    )}
                </div>

                {/* ── Subject Table ─────────────────────────────────────── */}
                <div className="bg-white dark:bg-[#1a1a24]/80 rounded-xl border border-gray-100 dark:border-gray-700/40 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <div style={{ minWidth: '480px' }}>

                            {/* Header Row */}
                            <div className="grid grid-cols-[1fr_94px_76px_66px_92px_30px] gap-0 border-b border-gray-100 dark:border-gray-700/40 px-4 py-2.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Subject</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-center">CA /30</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-center">Exam /70</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-center">Total</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-center">Result</span>
                                <span />
                            </div>

                            {/* Subject Rows */}
                            {activeYear.subjects.map((sub, idx) => {
                                const result    = getResult(sub);
                                const total     = getTotal(sub);
                                const isLast    = idx === activeYear.subjects.length - 1;
                                const isEditing = editSubjectId === sub.id;
                                const cumsOpen  = cumsOpenId === sub.id;
                                const entries   = getCumsEntries(sub.id);
                                const { mean, cums, count } = calcCums(entries);

                                return (
                                    <div key={sub.id}>
                                        {/* ── Main Row ── */}
                                        <div
                                            className={`grid grid-cols-[1fr_94px_76px_66px_92px_30px] gap-0 px-4 py-2.5 items-center transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02] group ${
                                                !isLast && !cumsOpen ? 'border-b border-gray-50 dark:border-gray-800/60' : ''
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

                                            {/* CA Score + CUMS Calculator toggle */}
                                            <div className="flex items-center justify-center gap-1">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={CA_MAX}
                                                    step={0.5}
                                                    value={sub.ca === '' ? '' : sub.ca}
                                                    onChange={e => handleScoreChange(activeYear.id, sub.id, 'ca', e.target.value, CA_MAX)}
                                                    placeholder="—"
                                                    className="w-12 text-center text-sm font-medium bg-gray-50 dark:bg-gray-800/60 rounded-md px-1 py-1 text-gray-800 dark:text-gray-200 outline-none border border-transparent focus:border-gray-300 dark:focus:border-gray-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                {/* CUMS toggle button */}
                                                <button
                                                    onClick={() => {
                                                        if (cumsOpen) {
                                                            setCumsOpenId(null);
                                                        } else {
                                                            initCumsEntries(sub.id);
                                                            setCumsOpenId(sub.id);
                                                        }
                                                    }}
                                                    title={cumsOpen ? 'Close CUMS calculator' : 'Calculate CA with CUMS formula'}
                                                    className={`flex-shrink-0 size-5 flex items-center justify-center rounded transition-all ${
                                                        cumsOpen
                                                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40'
                                                            : 'text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 opacity-0 group-hover:opacity-100'
                                                    }`}
                                                >
                                                    <Calculator size={11} />
                                                </button>
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

                                            {/* Total (read-only) */}
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

                                        {/* ── CUMS Sub-Calculator Panel ──────────────────────── */}
                                        {cumsOpen && (
                                            <div className={`px-4 py-3 bg-indigo-50/50 dark:bg-indigo-950/20 border-t border-indigo-100 dark:border-indigo-900/30 ${!isLast ? 'border-b border-gray-50 dark:border-gray-800/60' : ''}`}>
                                                {/* Panel header */}
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                                        <Calculator size={10} />
                                                        CUMS Calculator — CA /30
                                                    </p>
                                                    <p className="text-[10px] text-indigo-400 dark:text-indigo-500 font-medium">
                                                        Mean Average × 0.3
                                                    </p>
                                                </div>

                                                {/* Assessment entry rows */}
                                                <div className="flex flex-col gap-1.5 mb-2">
                                                    {entries.map((entry, ei) => (
                                                        <div key={entry.id} className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={entry.label}
                                                                onChange={e => updateCumsEntry(sub.id, entry.id, 'label', e.target.value)}
                                                                placeholder={`Assessment ${ei + 1}`}
                                                                className="flex-1 text-xs bg-white dark:bg-gray-800 rounded-md px-2 py-1.5 text-gray-700 dark:text-gray-300 outline-none border border-indigo-100 dark:border-indigo-900/40 focus:border-indigo-300 dark:focus:border-indigo-700 transition-colors min-w-0"
                                                            />
                                                            <input
                                                                type="number"
                                                                value={entry.score === '' ? '' : entry.score}
                                                                min={0}
                                                                max={100}
                                                                step={0.5}
                                                                onChange={e => {
                                                                    const v = e.target.value;
                                                                    if (v === '') { updateCumsEntry(sub.id, entry.id, 'score', ''); return; }
                                                                    const n = parseFloat(v);
                                                                    if (!isNaN(n)) updateCumsEntry(sub.id, entry.id, 'score', Math.min(100, Math.max(0, n)));
                                                                }}
                                                                placeholder="Score"
                                                                className="w-20 text-center text-xs font-medium bg-white dark:bg-gray-800 rounded-md px-1 py-1.5 text-gray-700 dark:text-gray-300 outline-none border border-indigo-100 dark:border-indigo-900/40 focus:border-indigo-300 dark:focus:border-indigo-700 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <button
                                                                onClick={() => removeCumsEntry(sub.id, entry.id)}
                                                                className="flex-shrink-0 size-5 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-colors"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Add Assessment */}
                                                <button
                                                    onClick={() => addCumsEntry(sub.id)}
                                                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors mb-3"
                                                >
                                                    <Plus size={11} />
                                                    Add Assessment
                                                </button>

                                                {/* Result summary */}
                                                {count > 0 ? (
                                                    <div className="flex items-center justify-between bg-white/70 dark:bg-indigo-900/20 rounded-lg px-3 py-2 border border-indigo-100 dark:border-indigo-900/40">
                                                        <div className="flex items-center gap-4 text-xs">
                                                            <div>
                                                                <span className="text-indigo-400 dark:text-indigo-500 font-medium">Mean </span>
                                                                <span className="font-bold text-indigo-700 dark:text-indigo-300">{mean}%</span>
                                                            </div>
                                                            <span className="text-indigo-200 dark:text-indigo-800">→</span>
                                                            <div>
                                                                <span className="text-indigo-400 dark:text-indigo-500 font-medium">CUMS Score </span>
                                                                <span className="font-bold text-indigo-700 dark:text-indigo-300">{cums} / 30</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => applyCumsScore(activeYear.id, sub.id)}
                                                            className="text-[11px] font-bold px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white transition-colors flex-shrink-0 ml-3"
                                                        >
                                                            Use {cums} as CA
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-indigo-400 dark:text-indigo-500 text-center py-1">
                                                        Enter assessment scores above to calculate your CA mark
                                                    </p>
                                                )}
                                            </div>
                                        )}
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

                {/* ── Legend ────────────────────────────────────────────── */}
                <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 text-center">
                    CA /30 &middot; Exam /70 &middot; Borderline ≥40 &middot; Pass ≥50 &middot; Credit ≥60 &middot; Distinction ≥70
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

            {/* AI Scanner */}
            <MedScannerModal
                isOpen={isScannerOpen}
                onClose={closeScannerAll}
                activeYear={activeYear}
                onImport={handleScanImport}
            />

            {/* Medical Footer */}
            <MedFooter medData={medData} />
        </>
    );
};

export default MedicalApp;

import React, { useState, useEffect } from 'react';
import { Calculator, Plus, FileDown, Trash2, X, Info, ScanLine, Settings, Github } from 'lucide-react';
import { Year, GradingScale, Course, GradingConfig } from './types';
import { getInitialData, getGradingConfig } from './constants';
import { calculateOverallStats, calculateSemesterStats, generateId, getClassOfDegree, createEmptyCourses } from './utils';
import SemesterSection from './components/SemesterSection';
import Footer from './components/Footer';
import GradingInfoModal from './components/GradingInfoModal';
import ConfirmationModal from './components/ConfirmationModal';
import AIScannerModal from './components/AIScannerModal';
import SettingsModal from './components/SettingsModal';
import Grainient from './components/Grainient';

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];

function App() {
    // State initialization with localStorage check
    const [data, setData] = useState<Year[]>(() => {
        try {
            const saved = localStorage.getItem('gpa_data');
            return saved ? JSON.parse(saved) : getInitialData();
        } catch (e) {
            return getInitialData();
        }
    });

    const [activeYearId, setActiveYearId] = useState<string>(() => {
        try {
            const savedData = localStorage.getItem('gpa_data');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                return parsed[0]?.id || 'year-1';
            }
            return 'year-1';
        } catch (e) {
            return 'year-1';
        }
    });

    const [scale, setScale] = useState<GradingScale>(() => {
        return (localStorage.getItem('gpa_scale') as GradingScale) || '5.0';
    });

    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'card'>(() => {
        return (localStorage.getItem('view_mode') as 'table' | 'card') || 'table';
    });

    const handleViewModeChange = (mode: 'table' | 'card') => {
        setViewMode(mode);
        localStorage.setItem('view_mode', mode);
    };
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Grading config
    const [gradingConfig, setGradingConfig] = useState<GradingConfig>(() => getGradingConfig());

    const handleGradingConfigChange = (config: GradingConfig) => {
        setGradingConfig(config);
        try { localStorage.setItem('grading_config', JSON.stringify(config)); } catch { }
    };

    const [showGradient, setShowGradient] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('show_gradient');
            return saved !== null ? saved === 'true' : true; // default ON
        } catch { return true; }
    });

    const [gradientColors, setGradientColors] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('gradient_colors');
            return saved ? JSON.parse(saved) : ['#FF9FFC', '#5227FF', '#B19EEF'];
        } catch { return ['#FF9FFC', '#5227FF', '#B19EEF']; }
    });

    const handleShowGradientChange = (show: boolean) => {
        setShowGradient(show);
        localStorage.setItem('show_gradient', String(show));
    };

    const handleGradientColorsChange = (colors: string[]) => {
        setGradientColors(colors);
        localStorage.setItem('gradient_colors', JSON.stringify(colors));
    };

    // Dark mode initialization — new users always start in light mode
    useEffect(() => {
        try {
            const theme = localStorage.getItem('theme');
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                // Default to light mode for new users (no saved theme)
                document.documentElement.classList.remove('dark');
                if (!theme) localStorage.setItem('theme', 'light');
            }
        } catch { }
    }, []);

    // Confirmation Modal State
    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmLabel?: string;
        isDestructive?: boolean;
        preferenceKey?: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    // Persistence effects
    useEffect(() => {
        localStorage.setItem('gpa_data', JSON.stringify(data));
    }, [data]);

    useEffect(() => {
        localStorage.setItem('gpa_scale', scale);
    }, [scale]);

    // Helper to trigger confirmation or immediate action based on preference
    const requestConfirmation = (
        actionConfig: {
            title: string;
            message: string;
            confirmLabel?: string;
            isDestructive?: boolean;
            preferenceKey?: string;
            onConfirm: () => void;
        }
    ) => {
        const { preferenceKey, onConfirm } = actionConfig;

        if (preferenceKey) {
            const dontAsk = localStorage.getItem(`confirm_pref_${preferenceKey}`);
            if (dontAsk === 'true') {
                onConfirm();
                return;
            }
        }

        setConfirmationState({
            isOpen: true,
            ...actionConfig,
        });
    };

    // Actions

    const handleClearAllData = () => {
        requestConfirmation({
            title: "Clear All Data",
            message: "CRITICAL WARNING: This will completely wipe all your data including all years and courses. This action cannot be undone. Are you sure?",
            confirmLabel: "Clear Everything",
            isDestructive: true,
            onConfirm: () => {
                const freshData = getInitialData();
                setData(freshData);
                setActiveYearId(freshData[0].id);
            }
        });
    };

    const deleteYear = (e: React.MouseEvent, yearId: string) => {
        e.stopPropagation();

        const yearIndex = data.findIndex(y => y.id === yearId);

        // Prevent deletion of the first year (Year 1)
        if (yearIndex === 0) {
            requestConfirmation({
                title: "Cannot Delete Year 1",
                message: "Year 1 cannot be deleted as it is the foundation of your academic record.",
                confirmLabel: "Got it",
                isDestructive: false,
                onConfirm: () => { },
            });
            return;
        }

        if (data.length <= 1) {
            requestConfirmation({
                title: "Cannot Delete",
                message: "You cannot delete the only remaining year. At least one year must exist.",
                confirmLabel: "Got it",
                isDestructive: false,
                onConfirm: () => { },
            });
            return;
        }

        requestConfirmation({
            title: "Delete Year",
            message: "Are you sure you want to delete this entire year? Subsequent years will be renumbered.",
            confirmLabel: "Delete Year",
            isDestructive: true,
            preferenceKey: "delete_year",
            onConfirm: () => {
                const filteredData = data.filter(y => y.id !== yearId);
                const newData = filteredData.map((year, index) => ({
                    ...year,
                    name: `Year ${index + 1}`
                }));

                setData(newData);

                if (yearId === activeYearId) {
                    const newActiveIndex = Math.min(yearIndex, newData.length - 1);
                    setActiveYearId(newData[newActiveIndex]?.id || newData[0].id);
                }
            }
        });
    };

    const addSemester = (yearId: string) => {
        setData(prevData => prevData.map(year => {
            if (year.id !== yearId) return year;

            const newSemesterNumber = year.semesters.length + 1;
            const label = ORDINALS[newSemesterNumber - 1] || `${newSemesterNumber}th`;
            const semesterName = `${label} Semester`;

            return {
                ...year,
                semesters: [
                    ...year.semesters,
                    {
                        id: generateId(),
                        name: semesterName,
                        courses: createEmptyCourses(3)
                    }
                ]
            };
        }));
    };

    const deleteSemester = (semesterId: string) => {
        const activeYear = data.find(y => y.id === activeYearId);
        if (!activeYear) return;

        if (activeYear.semesters.length <= 1) {
            requestConfirmation({
                title: "Cannot Delete Semester",
                message: "A year must have at least one semester. Add another semester before deleting this one.",
                confirmLabel: "Got it",
                isDestructive: false,
                onConfirm: () => { },
            });
            return;
        }

        requestConfirmation({
            title: "Delete Semester",
            message: "Are you sure you want to delete this semester? All courses and data within it will be lost.",
            confirmLabel: "Delete Semester",
            isDestructive: true,
            preferenceKey: "delete_semester",
            onConfirm: () => {
                setData(prevData => prevData.map(year => {
                    if (year.id !== activeYearId) return year;

                    const filteredSemesters = year.semesters.filter(sem => sem.id !== semesterId);

                    const renamedSemesters = filteredSemesters.map((sem, index) => {
                        const num = index + 1;
                        const label = ORDINALS[num - 1] || `${num}th`;
                        const name = `${label} Semester`;
                        return { ...sem, name };
                    });

                    return {
                        ...year,
                        semesters: renamedSemesters
                    };
                }));
            }
        });
    };

    // PDF Export — window.print() with Scholar Report HTML design
    const handleExportPDF = () => {
        const fd = data
            .map(y => ({
                ...y,
                semesters: y.semesters.filter(s => s.courses.some(c => (Number(c.unit) || 0) > 0))
            }))
            .filter(y => y.semesters.length > 0 && !y.isExcluded);

        if (fd.length === 0) {
            alert('No data to export! Add courses with units first.');
            return;
        }

        const ov = calculateOverallStats(data, scale, gradingConfig);
        const deg = getClassOfDegree(ov.cgpa, scale);
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        let exportCount = parseInt(localStorage.getItem('cgpa_pdf_count') || '0', 10);
        exportCount += 1;
        localStorage.setItem('cgpa_pdf_count', exportCount.toString());
        const filename = exportCount > 1 ? `CGPA_Report_${exportCount}` : `CGPA_Report`;

        const buildTableRows = (courses: Course[]): string =>
            courses
                .filter(c => (Number(c.unit) || 0) > 0)
                .map((c, i) => `
                  <tr>
                    <td style="padding: 6px 8px; color: #717973; font-family: 'Roboto Mono', monospace; font-size: 10px;">${String(i + 1).padStart(2, '0')}</td>
                    <td style="padding: 6px 8px; font-family: 'Roboto Mono', monospace; font-weight: 700; font-size: 10px;">${c.code || '—'}</td>
                    <td style="padding: 6px 8px; font-size: 10px;">${c.title || '—'}</td>
                    <td style="padding: 6px 8px; text-align: center; font-family: 'Roboto Mono', monospace; font-size: 10px;">${c.unit}</td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #426920; font-size: 10px; font-family: 'Epilogue', sans-serif;">${c.grade}</td>
                  </tr>`)
                .join('');

        const buildSemesterCards = (): string =>
            fd.map(year => {
                const semesterHtml = year.semesters.map(sem => {
                    const ss = calculateSemesterStats(sem.courses, scale, gradingConfig);
                    return `
                      <div style="position: relative; background: white; border-radius: 0 8px 8px 0; border: 1px solid rgba(0,46,2,0.05); border-left: none; margin-bottom: 12px; break-inside: avoid;">
                        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: #426920; border-radius: 6px 0 0 6px;"></div>
                        <div style="padding: 12px 12px 12px 20px;">
                          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
                            <h4 style="font-family: 'Epilogue', sans-serif; font-weight: 900; color: #002e02; text-transform: uppercase; letter-spacing: -0.025em; font-size: 14px; margin: 0;">${sem.name}</h4>
                            <div style="text-align: right;">
                              <span style="font-size: 7px; color: #717973; font-family: 'Roboto Mono', monospace; text-transform: uppercase; letter-spacing: 0.2em; display: block; line-height: 1;">Semester GPA</span>
                              <span style="font-size: 18px; font-weight: 900; color: #002e02; font-family: 'Epilogue', sans-serif;">${ss.gpa.toFixed(2)}</span>
                            </div>
                          </div>
                          <table style="width: 100%; text-align: left; border-collapse: collapse;">
                            <thead>
                              <tr style="border-bottom: 1px solid rgba(0,46,2,0.3);">
                                <th style="padding: 4px 8px; font-size: 8px; font-weight: 900; color: #002e02; font-family: 'Roboto Mono', monospace; text-transform: uppercase; width: 32px;">SN</th>
                                <th style="padding: 4px 8px; font-size: 8px; font-weight: 900; color: #002e02; font-family: 'Roboto Mono', monospace; text-transform: uppercase;">Code</th>
                                <th style="padding: 4px 8px; font-size: 8px; font-weight: 900; color: #002e02; font-family: 'Roboto Mono', monospace; text-transform: uppercase;">Title</th>
                                <th style="padding: 4px 8px; font-size: 8px; font-weight: 900; color: #002e02; font-family: 'Roboto Mono', monospace; text-transform: uppercase; text-align: center;">Units</th>
                                <th style="padding: 4px 8px; font-size: 8px; font-weight: 900; color: #002e02; font-family: 'Roboto Mono', monospace; text-transform: uppercase; text-align: right;">Grade</th>
                              </tr>
                            </thead>
                            <tbody style="border-collapse: collapse;">
                              ${buildTableRows(sem.courses)}
                            </tbody>
                          </table>
                        </div>
                      </div>`;
                }).join('');

                return `
                  <div style="margin-bottom: 24px; page-break-inside: avoid;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                      <h3 style="font-family: 'Epilogue', sans-serif; font-size: 16px; font-weight: 900; color: #002e02; text-transform: uppercase; letter-spacing: 0; margin: 0;">${year.name}</h3>
                      <div style="height: 1px; flex: 1; background: rgba(0,46,2,0.1);"></div>
                    </div>
                    ${semesterHtml}
                  </div>
                `;
            }).join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${filename}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;700;900&family=Manrope:wght@400;500;700&family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { size: A4; margin: 15mm; }
    @media print {
      body { background: none !important; padding: 0 !important; margin: 0 !important; }
      .no-print { display: none !important; }
      .a4-page { margin: 0 !important; box-shadow: none !important; background: white !important; }
      .cover-page { page-break-after: always; overflow: hidden; background: #F9FAF7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; height: 260mm !important; }
      .report-page { height: auto !important; padding: 0 !important; }
      .fixed-footer { position: fixed; bottom: 0; left: 0; width: 100%; text-align: center; display: block; }
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body { font-family: 'Manrope', sans-serif; background: #e5e7eb; margin: 0; padding: 20px 0; color: #111827; }
    .a4-page { width: 210mm; min-height: 297mm; margin: 10px auto; background: white; box-shadow: 0 4px 24px rgba(0,0,0,0.12); position: relative; overflow: hidden; }
    .cover-page { background: #F9FAF7; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40mm 30mm; position: relative; z-index: 10; height: 260mm; }
    .fixed-footer { position: absolute; bottom: 12mm; left: 0; width: 100%; text-align: center; }
    .report-page { padding: 10px; display: flex; flex-direction: column; }
    .no-print-bar { text-align: center; margin-bottom: 16px; font-family: Manrope, sans-serif; font-size: 13px; color: #717973; padding: 8px; }
    .print-btn { background: #111827; color: white; border: none; padding: 12px 24px; border-radius: 9999px; font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; margin: 0 auto 16px; }
    .geo-line { position: absolute; background: rgba(46,125,50,0.15); }
    .geo-node { position: absolute; width: 6px; height: 6px; background: #2E7D32; border-radius: 50%; }
    .data-line { position: absolute; width: 1px; background: linear-gradient(to bottom, transparent, rgba(46,125,50,0.35), transparent); }
    tbody tr:not(:last-child) td { border-bottom: 1px solid rgba(17,24,39,0.08); }
  </style>
</head>
<body>

<div class="no-print">
  <div class="no-print-bar">Your Scholar Report is ready. Click <strong>Save as PDF</strong> to download.</div>
  <button class="print-btn" onclick="window.print()">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Save as PDF
  </button>
</div>

<!-- COVER PAGE -->
<div class="a4-page cover-page page-break">
  <!-- Grid lines -->
  <div class="geo-line" style="width: 100%; height: 1px; top: 25%; left: 0;"></div>
  <div class="geo-line" style="width: 100%; height: 1px; bottom: 25%; left: 0;"></div>
  <div class="geo-line" style="height: 100%; width: 1px; left: 33.33%; top: 0;"></div>
  <div class="geo-line" style="height: 100%; width: 1px; right: 33.33%; top: 0;"></div>
  <div class="geo-node" style="top: 25%; left: 33.33%; transform: translate(-50%, -50%);"></div>
  <div class="geo-node" style="top: 25%; right: 33.33%; transform: translate(50%, -50%);"></div>
  <div class="geo-node" style="bottom: 25%; left: 33.33%; transform: translate(-50%, 50%);"></div>
  <div class="geo-node" style="bottom: 25%; right: 33.33%; transform: translate(50%, 50%);"></div>
  <div class="data-line" style="height: 16rem; left: 20%; top: 0;"></div>
  <div class="data-line" style="height: 12rem; right: 25%; bottom: 0;"></div>
  <!-- Wireframe shapes -->
  <div style="position: absolute; width: 200px; height: 200px; top: 10%; left: 8%; border: 2px solid rgba(46,125,50,0.15); transform: rotateX(45deg) rotateZ(45deg);"></div>
  <div style="position: absolute; width: 160px; height: 160px; bottom: 12%; right: 8%; clip-path: polygon(50% 0%,0% 100%,100% 100%); background: linear-gradient(to top, rgba(46,125,50,0.15), transparent);"></div>

  <!-- Content -->
  <div style="position: relative; z-index: 10;">
    <div style="margin-bottom: 24px; display: flex; justify-content: center;">
      <div style="width: 64px; height: 64px; border: 1px solid rgba(46,125,50,0.3); display: flex; align-items: center; justify-content: center; position: relative;">
        <div style="width: 24px; height: 24px; border: 2px solid rgba(46,125,50,0.5); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; background: rgba(46,125,50,0.8);"></div>
        </div>
      </div>
    </div>
    <h1 style="font-family: 'Epilogue', sans-serif; font-size: 72px; font-weight: 900; color: #2E7D32; line-height: 0.9; letter-spacing: -0.05em; text-transform: uppercase; margin: 0;">SCHOLAR<br/>REPORT</h1>

    <div style="margin-top: 32px; display: flex; align-items: center; justify-content: center; gap: 16px;">
      <div style="height: 1px; width: 64px; background: rgba(46,125,50,0.3);"></div>
      <span style="font-family: 'Roboto Mono', monospace; font-weight: 700; color: #2E7D32; letter-spacing: 0.5em; font-size: 11px; text-transform: uppercase;">CGPA CALCULATOR</span>
      <div style="height: 1px; width: 64px; background: rgba(46,125,50,0.3);"></div>
    </div>
  </div>
</div>

<!-- REPORT PAGE -->
<div class="a4-page report-page">
  <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #111827; padding-bottom: 8px;">
    <div>
      <h2 style="font-family: 'Epilogue', sans-serif; font-size: 24px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: -0.025em; margin: 0;">Academic Report</h2>
    </div>
  </header>

  <!-- Summary Card -->
  <section style="margin-bottom: 24px;">
    <div style="background: #f9fafb; border-radius: 16px; padding: 8px; border: 1px solid rgba(17,24,39,0.1); display: flex; align-items: center; justify-content: space-between; gap: 16px;">
      <div style="background: #2E7D32; color: white; padding: 12px; border-radius: 12px; position: relative; overflow: hidden; width: 220px; text-align: center; flex-shrink: 0;">
        <div style="position: absolute; right: -16px; top: -16px; width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.1);"></div>
        <p style="font-size: 8px; font-family: 'Manrope', sans-serif; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.9; margin: 0 0 2px;">Cumulative CGPA</p>
        <div style="font-size: 36px; font-weight: 900; font-family: 'Epilogue', sans-serif; line-height: 1;">${ov.cgpa.toFixed(2)}</div>
        <div style="margin-top: 4px; display: inline-block; padding: 2px 8px; background: rgba(0,0,0,0.2); border-radius: 9999px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${deg}</div>
      </div>
      <div style="display: flex; flex: 1; justify-content: space-around; align-items: center; padding: 0 16px;">
        <div style="text-align: center;">
          <p style="font-size: 8px; color: #717973; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 2px; font-family: 'Roboto Mono', monospace;">Total Credits</p>
          <div style="font-size: 22px; font-weight: 900; color: #111827; font-family: 'Epilogue', sans-serif;">${ov.grandTotalUnits}</div>
        </div>
        <div style="width: 1px; height: 24px; background: rgba(17,24,39,0.2);"></div>
        <div style="text-align: center;">
          <p style="font-size: 8px; color: #717973; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 2px; font-family: 'Roboto Mono', monospace;">Grading Scale</p>
          <div style="font-size: 22px; font-weight: 900; color: #111827; font-family: 'Epilogue', sans-serif;">${scale} Point</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Semester Breakdown -->
  <section style="flex: 1;">
    <h3 style="font-size: 9px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 12px; font-family: 'Manrope', sans-serif; display: flex; align-items: center; gap: 12px;">
      Performance Breakdown <span style="height: 1px; flex: 1; background: rgba(17,24,39,0.1); display: inline-block;"></span>
    </h3>
    ${buildSemesterCards()}
  </section>

  <!-- Footer is handled via fixed-footer class globally now -->

</div>

<div class="fixed-footer">
  <p style="font-size: 7px; font-family: 'Roboto Mono', monospace; font-weight: 700; color: rgba(17,24,39,0.4); text-transform: uppercase; letter-spacing: 0.3em; margin: 0;">CGPA CALCULATOR &mdash; ACADEMIC REPORT</p>
</div>

</body>
</html>`;

        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) {
            alert('Could not open print window. Please allow popups for this site.');
            return;
        }
        win.document.write(html);
        win.document.close();
    };

    const addYear = () => {
        const newYearId = generateId();
        const yearNumber = data.length + 1;
        const newYear: Year = {
            id: newYearId,
            name: `Year ${yearNumber}`,
            semesters: [
                { id: generateId(), name: 'First Semester', courses: createEmptyCourses(3) },
                { id: generateId(), name: 'Second Semester', courses: createEmptyCourses(3) },
            ],
        };
        setData([...data, newYear]);
        setActiveYearId(newYearId);
    };

    const addCourse = (semesterId: string) => {
        setData((prevData) =>
            prevData.map((year) => ({
                ...year,
                semesters: year.semesters.map((sem) => {
                    if (sem.id === semesterId) {
                        return {
                            ...sem,
                            courses: [
                                ...sem.courses,
                                ...createEmptyCourses(1),
                            ],
                        };
                    }
                    return sem;
                }),
            }))
        );
    };

    const updateCourse = (semesterId: string, courseId: string, field: keyof Course, value: string | number) => {
        setData((prevData) =>
            prevData.map((year) => ({
                ...year,
                semesters: year.semesters.map((sem) => {
                    if (sem.id === semesterId) {
                        return {
                            ...sem,
                            courses: sem.courses.map((course) =>
                                course.id === courseId ? { ...course, [field]: value } : course
                            ),
                        };
                    }
                    return sem;
                }),
            }))
        );
    };

    const deleteCourse = (semesterId: string, courseId: string) => {
        setData((prevData) =>
            prevData.map((year) => ({
                ...year,
                semesters: year.semesters.map((sem) => {
                    if (sem.id === semesterId) {
                        return {
                            ...sem,
                            courses: sem.courses.filter((c) => c.id !== courseId),
                        };
                    }
                    return sem;
                }),
            }))
        );
    };

    const toggleYearExclusion = (yearId: string) => {
        setData(prevData => prevData.map(year => {
            if (year.id === yearId) {
                return { ...year, isExcluded: !year.isExcluded };
            }
            return year;
        }));
    };

    // AI Import Logic
    const handleAIImport = (newCourses: Course[], semesterId: string) => {
        setData((prevData) =>
            prevData.map((year) => {
                const hasSemester = year.semesters.some(s => s.id === semesterId);
                if (!hasSemester) return year;

                return {
                    ...year,
                    semesters: year.semesters.map((sem) => {
                        if (sem.id === semesterId) {
                            const existingCourses = sem.courses.filter(c => c.code || c.title || c.unit > 0);
                            return {
                                ...sem,
                                courses: [...existingCourses, ...newCourses]
                            };
                        }
                        return sem;
                    })
                };
            })
        );
    };

    // Derived State
    const activeYear = data.find((y) => y.id === activeYearId) || data[0];
    const overallStats = calculateOverallStats(data, scale, gradingConfig);

    return (
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-50/50 dark:bg-[#0d0d14]/80 transition-colors">
            {showGradient && (
                <Grainient
                    colors={gradientColors}
                    timeSpeed={0.2}
                    colorBalance={0}
                    warpStrength={1}
                    warpFrequency={4}
                    warpSpeed={1.5}
                    warpAmplitude={40}
                    blendAngle={0}
                    blendSoftness={0.1}
                    rotationAmount={400}
                    noiseScale={2}
                    grainAmount={0.15}
                    grainScale={2}
                    grainAnimated={false}
                    contrast={1.6}
                    gamma={1}
                    saturation={1.3}
                    centerX={0}
                    centerY={0}
                    zoom={0.9}
                />
            )}
            {/* Header */}
            <header className="flex-none bg-white/90 dark:bg-[#1a1a24]/95 backdrop-blur-md border-b border-gray-100/80 dark:border-gray-700/40 px-4 sm:px-6 py-3 z-30 transition-colors relative">
                <div className="max-w-[960px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                            <Calculator size={16} />
                        </div>
                        <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">CGPA Calculator</h1>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={handleClearAllData}
                            className="flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Clear All Data"
                        >
                            <Trash2 size={15} />
                        </button>
                        <button
                            onClick={() => setIsAIModalOpen(true)}
                            className="flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Scan Document"
                        >
                            <ScanLine size={15} />
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Export PDF"
                        >
                            <FileDown size={15} />
                        </button>
                        <a
                            href="https://github.com/Endiong/CGPA-Calculator"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="GitHub Repository"
                        >
                            <Github size={15} />
                        </a>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Settings"
                        >
                            <Settings size={15} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Year Tabs — sticky inside scroll area so content scrolls behind it */}
                <div className="sticky top-0 bg-white/20 dark:bg-[#1a1a24]/20 backdrop-blur-xl px-1 sm:px-6 pt-2.5 pb-3 z-20 transition-colors">
                    <div className="max-w-[960px] mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar px-2 sm:px-0 py-0.5">
                        {data.map((year, index) => (
                            <button
                                key={year.id}
                                onClick={() => setActiveYearId(year.id)}
                                className={`group relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeYearId === year.id
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {year.name}
                                {data.length > 1 && index !== 0 && (
                                    <span
                                        onClick={(e) => deleteYear(e as any, year.id)}
                                        className={`ml-0.5 rounded-full transition-colors ${activeYearId === year.id
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

                <div className="max-w-[960px] mx-auto px-4 sm:px-6 pb-36 pt-4">

                    {/* Exclude/Include toggle */}
                    {activeYear && (
                        <div className={`mb-4 mt-3 px-3 py-2 rounded-lg flex items-center justify-between text-xs ${activeYear.isExcluded
                            ? 'bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/40'
                            : 'bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-800/40'
                            }`}>
                            <span className={`font-medium ${activeYear.isExcluded ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                {activeYear.isExcluded
                                    ? 'This year is excluded — not counted in CGPA or PDF'
                                    : 'This year is included in your CGPA calculation'}
                            </span>
                            <button
                                onClick={() => toggleYearExclusion(activeYear.id)}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${activeYear.isExcluded
                                    ? 'text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                    }`}
                            >
                                {activeYear.isExcluded ? 'Include' : 'Exclude'}
                            </button>
                        </div>
                    )}

                    {/* Semesters */}
                    <div className="flex flex-col gap-6 relative z-10">
                        {activeYear && activeYear.semesters.map((semester) => (
                            <SemesterSection
                                key={semester.id}
                                semester={semester}
                                scale={scale}
                                viewMode={viewMode}
                                onAddCourse={addCourse}
                                onUpdateCourse={updateCourse}
                                onDeleteCourse={deleteCourse}
                                onDeleteSemester={deleteSemester}
                            />
                        ))}

                        {activeYear && (
                            <div className="flex justify-center pt-4 pb-6 relative z-10">
                                <button
                                    onClick={() => addSemester(activeYear.id)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-white/60 dark:bg-[#1a1a24]/60 backdrop-blur-lg shadow-sm hover:shadow-md transition-all"
                                >
                                    <Plus size={14} />
                                    Add Semester
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer
                scale={scale}
                onScaleChange={setScale}
                totalUnits={overallStats.grandTotalUnits}
                totalPoints={overallStats.grandTotalPoints}
                cgpa={overallStats.cgpa}
            />

            {/* Modals & Widgets */}
            <GradingInfoModal />

            <ConfirmationModal
                isOpen={confirmationState.isOpen}
                onClose={() => setConfirmationState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationState.onConfirm}
                title={confirmationState.title}
                message={confirmationState.message}
                confirmLabel={confirmationState.confirmLabel}
                isDestructive={confirmationState.isDestructive}
                preferenceKey={confirmationState.preferenceKey}
            />

            <AIScannerModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onImport={handleAIImport}
                semesters={activeYear.semesters}
                viewMode={viewMode}
                gradingConfig={gradingConfig}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                showGradient={showGradient}
                onShowGradientChange={handleShowGradientChange}
                gradientColors={gradientColors}
                onGradientColorsChange={handleGradientColorsChange}
                gradingConfig={gradingConfig}
                onGradingConfigChange={handleGradingConfigChange}
                scale={scale}
            />
        </div>
    );
}

export default App;
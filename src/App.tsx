import React, { useState, useEffect } from 'react';
import { Calculator, Plus, FileDown, Trash2, X, Info, ScanLine, Settings, Github } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Year, GradingScale, Course } from './types';
import { getInitialData } from './constants';
import { calculateOverallStats, calculateSemesterStats, generateId, getGradeValue, getClassOfDegree, getGradeColorRGB, createEmptyCourses } from './utils';
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

    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'card'>(() => {
        return (localStorage.getItem('view_mode') as 'table' | 'card') || 'table';
    });

    const handleViewModeChange = (mode: 'table' | 'card') => {
        setViewMode(mode);
        localStorage.setItem('view_mode', mode);
    };
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

    // PDF Export Logic — Premium Design v3
    const handleExportPDF = () => {
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const m = 22;

        // ── Design Tokens ──
        const NAVY: [number, number, number] = [15, 23, 42];
        const INDIGO: [number, number, number] = [79, 70, 229];
        const WHITE: [number, number, number] = [255, 255, 255];
        const DARK: [number, number, number] = [30, 41, 59];
        const MED: [number, number, number] = [100, 116, 139];
        const LIGHT_TEXT: [number, number, number] = [148, 163, 184];
        const RULE: [number, number, number] = [226, 232, 240];

        // Filter data
        const fd = data.map(y => ({
            ...y,
            semesters: y.semesters.filter(s => s.courses.some(c => (Number(c.unit) || 0) > 0))
        })).filter(y => y.semesters.length > 0 && !y.isExcluded);

        if (fd.length === 0) {
            alert("No data to export! Add courses with units first.");
            return;
        }

        const ov = calculateOverallStats(data, scale);
        const deg = getClassOfDegree(ov.cgpa, scale);
        const cRGB = getGradeColorRGB(ov.cgpa, scale);

        let fileNum = 1;
        try {
            const saved = localStorage.getItem('pdf_export_count');
            fileNum = saved ? parseInt(saved) + 1 : 1;
            localStorage.setItem('pdf_export_count', String(fileNum));
        } catch { }

        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // ══════════════════════════════
        //  COVER PAGE
        // ══════════════════════════════

        // Navy background
        doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.rect(0, 0, pw, ph, 'F');

        // Left accent bar
        doc.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
        doc.rect(0, 0, 5, ph, 'F');

        // Top-right decorative circle
        doc.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
        doc.setGState(doc.GState({ opacity: 0.12 }));
        doc.circle(pw + 15, -15, 55, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));

        // Brand label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(INDIGO[0], INDIGO[1], INDIGO[2]);
        doc.text('CGPA CALCULATOR', m, 28);
        doc.setDrawColor(INDIGO[0], INDIGO[1], INDIGO[2]);
        doc.setLineWidth(0.4);
        doc.line(m, 31, m + 30, 31);

        // Title — SCHOLAR
        const ty = ph * 0.28;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(52);
        doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
        doc.text('SCHOLAR', m, ty);

        // Title — REPORT on indigo bg
        const rY = ty + 14;
        doc.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
        doc.roundedRect(m - 4, rY - 16, 108, 22, 3, 3, 'F');
        doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
        doc.setFontSize(52);
        doc.text('REPORT', m, rY);

        // Subtitle
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(LIGHT_TEXT[0], LIGHT_TEXT[1], LIGHT_TEXT[2]);
        doc.text('A comprehensive overview of your academic', m, rY + 20);
        doc.text('performance across all semesters and years.', m, rY + 27);

        // Separator
        doc.setDrawColor(INDIGO[0], INDIGO[1], INDIGO[2]);
        doc.setGState(doc.GState({ opacity: 0.4 }));
        doc.setLineWidth(0.4);
        doc.line(m, rY + 37, pw - m, rY + 37);
        doc.setGState(doc.GState({ opacity: 1 }));

        // Stats cards on cover — 2x2
        const sY = rY + 47;
        const sw = (pw - m * 2 - 8) / 2;

        const coverCard = (x: number, y: number, w: number, label: string, value: string, accent: [number, number, number]) => {
            // Card background (subtle white tint)
            doc.setFillColor(255, 255, 255);
            doc.setGState(doc.GState({ opacity: 0.06 }));
            doc.roundedRect(x, y, w, 24, 3, 3, 'F');
            doc.setGState(doc.GState({ opacity: 1 }));
            // Border
            doc.setDrawColor(accent[0], accent[1], accent[2]);
            doc.setGState(doc.GState({ opacity: 0.35 }));
            doc.setLineWidth(0.3);
            doc.roundedRect(x, y, w, 24, 3, 3, 'S');
            doc.setGState(doc.GState({ opacity: 1 }));
            // Left accent bar
            doc.setFillColor(accent[0], accent[1], accent[2]);
            doc.roundedRect(x, y + 4, 3, 16, 1.5, 1.5, 'F');
            // Label
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(LIGHT_TEXT[0], LIGHT_TEXT[1], LIGHT_TEXT[2]);
            doc.text(label.toUpperCase(), x + 8, y + 9);
            // Value
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
            doc.text(value, x + 8, y + 20);
        };

        coverCard(m, sY, sw, 'Cumulative CGPA', ov.cgpa.toFixed(2), cRGB);
        coverCard(m + sw + 8, sY, sw, 'Classification', deg, INDIGO);
        coverCard(m, sY + 30, sw, 'Total Credits', ov.grandTotalUnits.toString(), INDIGO);
        coverCard(m + sw + 8, sY + 30, sw, 'Grading Scale', `${scale} Point`, cRGB);

        // Cover footer
        const fY = ph - 20;
        doc.setDrawColor(INDIGO[0], INDIGO[1], INDIGO[2]);
        doc.setGState(doc.GState({ opacity: 0.3 }));
        doc.setLineWidth(0.3);
        doc.line(m, fY, pw - m, fY);
        doc.setGState(doc.GState({ opacity: 1 }));
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(LIGHT_TEXT[0], LIGHT_TEXT[1], LIGHT_TEXT[2]);
        doc.text('CGPA Calculator  \u00b7  Scholar Report', m, fY + 7);
        doc.text(dateStr, pw - m - doc.getTextWidth(dateStr), fY + 7);

        // ══════════════════════════════
        //  INTERIOR PAGE HELPERS
        // ══════════════════════════════

        const setupPage = () => {
            doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
            doc.rect(0, 0, pw, ph, 'F');
            // Indigo top line
            doc.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
            doc.rect(0, 0, pw, 2, 'F');
            // Left accent
            doc.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
            doc.rect(0, 0, 3, ph, 'F');
        };

        const drawRule = (y: number) => {
            doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
            doc.setLineWidth(0.3);
            doc.line(m, y, pw - m, y);
        };

        // ══════════════════════════════
        //  PAGE 2 — Academic History only (stats already on cover)
        // ══════════════════════════════
        doc.addPage();
        setupPage();

        let cy = 16;

        // Section title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.text('ACADEMIC HISTORY', m, cy);
        cy += 3;
        drawRule(cy);
        cy += 8;

        fd.forEach((year) => {
            if (cy > ph - 40) { doc.addPage(); setupPage(); cy = 16; }

            // Year label
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
            doc.text(year.name.toUpperCase(), m, cy);
            doc.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
            doc.rect(m, cy + 2, 16, 1, 'F');
            cy += 10;

            year.semesters.forEach((sem) => {
                const ss = calculateSemesterStats(sem.courses, scale);
                const sRGB = getGradeColorRGB(ss.gpa, scale);
                if (cy > ph - 50) { doc.addPage(); setupPage(); cy = 16; }

                // Semester name + GPA pill
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(DARK[0], DARK[1], DARK[2]);
                doc.text(sem.name, m, cy);

                const semNameW = doc.getTextWidth(sem.name);
                const gpaLabel = `${ss.gpa.toFixed(2)}`;
                doc.setFontSize(7);
                const gpaW = doc.getTextWidth(gpaLabel) + 6;
                doc.setFillColor(sRGB[0], sRGB[1], sRGB[2]);
                doc.roundedRect(m + semNameW + 4, cy - 4, gpaW, 5.5, 2.5, 2.5, 'F');
                doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
                doc.setFont('helvetica', 'bold');
                doc.text(gpaLabel, m + semNameW + 7, cy - 0.5);
                cy += 5;

                const tbody = sem.courses
                    .filter(c => (Number(c.unit) || 0) > 0)
                    .map((c, i) => [
                        (i + 1).toString(),
                        c.code.toUpperCase() || '-',
                        c.title || '-',
                        c.unit.toString(),
                        c.grade,
                        ((Number(c.unit) || 0) * getGradeValue(c.grade, scale)).toFixed(1)
                    ]);

                autoTable(doc, {
                    startY: cy,
                    head: [['#', 'CODE', 'TITLE', 'UNIT', 'GR', 'PTS']],
                    body: tbody,
                    theme: 'plain',
                    margin: { left: m, right: m },
                    headStyles: {
                        fillColor: [248, 250, 252],
                        textColor: MED,
                        fontStyle: 'bold',
                        halign: 'left',
                        fontSize: 6.5,
                        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }
                    },
                    bodyStyles: {
                        textColor: DARK,
                        fontSize: 7.5,
                        lineColor: RULE,
                        lineWidth: 0.15,
                        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }
                    },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    columnStyles: {
                        0: { cellWidth: 8, halign: 'center', textColor: LIGHT_TEXT },
                        1: { cellWidth: 20, fontStyle: 'bold' },
                        2: { cellWidth: 'auto' },
                        3: { cellWidth: 10, halign: 'center' },
                        4: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: sRGB },
                        5: { cellWidth: 12, halign: 'right' }
                    },
                    styles: { font: 'helvetica', fillColor: WHITE }
                });

                // @ts-ignore
                cy = doc.lastAutoTable.finalY + 8;
            });
            cy += 4;
        });

        // Page footers (interior pages only)
        const tp = doc.internal.pages.length - 1;
        for (let i = 2; i <= tp; i++) {
            doc.setPage(i);
            drawRule(ph - 12);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(LIGHT_TEXT[0], LIGHT_TEXT[1], LIGHT_TEXT[2]);
            doc.text('CGPA Calculator  \u00b7  Scholar Report', m, ph - 7);
            const pn = `${i - 1} / ${tp - 1}`;
            doc.text(pn, pw - m - doc.getTextWidth(pn), ph - 7);
        }

        doc.save(`Scholar_Report_${fileNum}.pdf`);
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
    const overallStats = calculateOverallStats(data, scale);

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
                            onClick={() => setIsInfoModalOpen(true)}
                            className="flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Grading Guide"
                        >
                            <Info size={15} />
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
                                    ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
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

            {/* Modals */}
            <GradingInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />

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
            />
        </div>
    );
}

export default App;
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
import { handleExportPDF } from './utils/exportPDF';

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
    const executeExportPDF = () => {
        handleExportPDF(data, scale, gradingConfig);
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
                            onClick={executeExportPDF}
                            className="flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Export to PDF"
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
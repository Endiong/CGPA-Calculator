import React, { useState, useEffect } from 'react';
import { Calculator, Plus, FileDown, Trash2, X, Info, ScanLine, Settings } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Year, GradingScale, Course } from './types';
import { getInitialData } from './constants';
import { calculateOverallStats, calculateSemesterStats, generateId, getGradeValue, getClassOfDegree, getGradeColorRGB } from './utils';
import SemesterSection from './components/SemesterSection';
import Footer from './components/Footer';
import GradingInfoModal from './components/GradingInfoModal';
import ConfirmationModal from './components/ConfirmationModal';
import AIScannerModal from './components/AIScannerModal';
import SettingsModal from './components/SettingsModal';
import Grainient from './components/Grainient';

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

  // Dark mode initialization
  useEffect(() => {
    try {
      const theme = localStorage.getItem('theme');
      if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
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
  const createEmptyCourses = (count: number) =>
    Array.from({ length: count }).map(() => ({
      id: generateId(),
      code: '',
      title: '',
      unit: 0,
      grade: 'A' as const
    }));

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
      alert("Year 1 cannot be deleted as it is the foundation of your record.");
      return;
    }

    if (data.length <= 1) {
      alert("You cannot delete the only remaining year.");
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
      const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
      const label = ordinals[newSemesterNumber - 1] || `${newSemesterNumber}th`;
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
      alert("A year must have at least one semester.");
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
            const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
            const label = ordinals[num - 1] || `${num}th`;
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

  // PDF Export Logic
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Design Colors (Premium Brand Theme)
    const primaryColor = [17, 24, 39] as [number, number, number]; // #111827 (Charcoal/Dark Blue)
    const accentColor = [5, 150, 105] as [number, number, number]; // #059669 (Emerald)
    const grayBg = [249, 250, 251]; // Gray 50
    const darkText = [17, 24, 39]; // Gray 900
    const lightText = [107, 114, 128]; // Gray 500

    // Filter Logic: Remove empty years AND excluded years
    const filteredData = data.map(year => ({
      ...year,
      semesters: year.semesters.filter(sem =>
        sem.courses.some(c => (Number(c.unit) || 0) > 0)
      )
    })).filter(year => year.semesters.length > 0 && !year.isExcluded);

    if (filteredData.length === 0) {
      alert("No data to export! Please add some courses and units, or ensure years are Included.");
      return;
    }

    const overall = calculateOverallStats(data, scale);
    const degreeClass = getClassOfDegree(overall.cgpa, scale);
    const classRGB = getGradeColorRGB(overall.cgpa, scale);

    // --- Helper Functions ---
    const drawGeometricBackground = (isCover: boolean = false) => {
      // Base background
      doc.setFillColor(grayBg[0], grayBg[1], grayBg[2]);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      if (isCover) {
        // Large background accent for cover
        doc.setFillColor(243, 244, 246);
        doc.triangle(pageWidth * 0.4, 0, pageWidth, 0, pageWidth, pageHeight * 0.4, 'F');

        // Vertical primary accent
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 12, pageHeight, 'F');

        // Brand accent line
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(12, pageHeight * 0.6, 4, 80, 'F');

        // Pattern overlay (subtle dots)
        doc.setFillColor(229, 231, 235);
        for (let x = 40; x < pageWidth; x += 30) {
          for (let y = 40; y < pageHeight; y += 30) {
            doc.circle(x, y, 0.5, 'F');
          }
        }
      } else {
        // Sidebar accent for content pages
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 6, pageHeight, 'F');

        // Subtle top accent
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 0, pageWidth, 2, 'F');
      }
    };

    const drawPremiumCard = (x: number, y: number, w: number, h: number, label: string, value: string, rgb: [number, number, number], isMain: boolean = false) => {
      // Soft Shadow effect
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(x + 1, y + 1, w, h, 3, 3, 'F');

      // Card Background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(x, y, w, h, 3, 3, 'FD');

      // Top indicator bar
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(x + 4, y + 4, 3, 10, 'F');

      // Label
      doc.setFontSize(8);
      doc.setTextColor(lightText[0], lightText[1], lightText[2]);
      doc.setFont("helvetica", "bold");
      doc.text(label.toUpperCase(), x + 10, y + 10);

      // Value
      doc.setFontSize(isMain ? 20 : 14);
      doc.setTextColor(isMain ? rgb[0] : darkText[0], isMain ? rgb[1] : darkText[1], isMain ? rgb[2] : darkText[2]);
      doc.text(value, x + 10, y + 22);
    };

    // --- COVER PAGE ---
    drawGeometricBackground(true);

    // Header
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("GPA Calculator", 30, 40);

    // Title Section
    const titleY = pageHeight / 3;
    doc.setFontSize(32);
    doc.setFont("times", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text("ACADEMIC", 30, titleY);
    doc.text("PERFORMANCE", 30, titleY + 14);

    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text("REPORT", 30, titleY + 28);

    // Meta Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text("A detailed analysis of your scholarly achievements,", 30, titleY + 45);
    doc.text("including semester breakdowns and cumulative standing.", 30, titleY + 50);

    // Decorative Separator
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(1.5);
    doc.line(30, titleY + 60, 100, titleY + 60);

    // Branding Strip
    const footerY = pageHeight - 60;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, footerY, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("DATE OF ISSUE", 30, footerY + 12);
    doc.setFontSize(14);
    doc.setFont("times", "bold");
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(dateStr, 30, footerY + 22);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(209, 213, 219);
    doc.text("OFFICIAL REPORT NO.", pageWidth - 70, footerY + 12);
    doc.setFontSize(14);
    doc.setFont("times", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`TR-${generateId().toUpperCase()}`, pageWidth - 70, footerY + 22);

    // --- SUMMARY & DETAILS ---
    doc.addPage();
    drawGeometricBackground();

    let currentY = 30;

    // Header title for breakdown
    doc.setFontSize(22);
    doc.setFont("times", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text("SUMMARY & STANDING", 25, currentY);

    currentY += 15;

    // Cards Grid
    const cardGap = 8;
    const cw = (pageWidth - 50 - cardGap) / 2;
    const ch = 35;

    drawPremiumCard(25, currentY, cw, ch, "Cumulative GPA", overall.cgpa.toFixed(2), classRGB, true);
    drawPremiumCard(25 + cw + cardGap, currentY, cw, ch, "Degree Classification", degreeClass, classRGB);

    currentY += ch + cardGap;

    drawPremiumCard(25, currentY, cw, ch, "Total Credits/Units", overall.grandTotalUnits.toString(), [107, 114, 128]);
    drawPremiumCard(25 + cw + cardGap, currentY, cw, ch, "Grading Formula", `Standard ${scale} Scale`, [107, 114, 128]);

    currentY += ch + 25;

    // --- ACADEMIC HISTORY ---
    doc.setFontSize(18);
    doc.setFont("times", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text("ACADEMIC HISTORY", 25, currentY);

    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(1);
    doc.line(25, currentY + 3, 90, currentY + 3);

    currentY += 15;

    filteredData.forEach((year) => {
      // Check page overflow
      if (currentY > pageHeight - 40) {
        doc.addPage();
        drawGeometricBackground();
        currentY = 30;
      }

      // Year Header
      doc.setFillColor(243, 244, 246);
      doc.rect(25, currentY - 5, pageWidth - 50, 10, 'F');

      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(year.name.toUpperCase(), 30, currentY + 2);

      currentY += 15;

      year.semesters.forEach((sem) => {
        const stats = calculateSemesterStats(sem.courses, scale);
        const semRGB = getGradeColorRGB(stats.gpa, scale);

        // Check page overflow before semester
        if (currentY > pageHeight - 50) {
          doc.addPage();
          drawGeometricBackground();
          currentY = 30;
        }

        // Semester Header with dynamic pill
        doc.setFont("times", "bold");
        doc.setFontSize(12);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text(sem.name, 25, currentY);

        // GPA Pill
        const pillText = `GPA: ${stats.gpa.toFixed(2)}`;
        const pillW = doc.getTextWidth(pillText) + 6;
        doc.setFillColor(semRGB[0], semRGB[1], semRGB[2]);
        doc.roundedRect(25 + doc.getTextWidth(sem.name) + 5, currentY - 4.5, pillW, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(pillText, 25 + doc.getTextWidth(sem.name) + 8, currentY - 0.5);

        currentY += 6;

        const tableBody = sem.courses
          .filter(c => (Number(c.unit) || 0) > 0)
          .map((course, index) => [
            index + 1,
            course.code.toUpperCase() || '-',
            course.title || '-',
            course.unit,
            course.grade,
            ((Number(course.unit) || 0) * getGradeValue(course.grade, scale)).toFixed(1)
          ]);

        autoTable(doc, {
          startY: currentY,
          head: [['S/N', 'CODE', 'COURSE TITLE', 'UNIT', 'GR', 'PTS']],
          body: tableBody,
          theme: 'striped',
          margin: { left: 25 },
          headStyles: {
            fillColor: primaryColor,
            textColor: 255,
            fontStyle: 'bold',
            halign: 'left',
          },
          bodyStyles: {
            textColor: 60,
            fontSize: 7,
          },
          alternateRowStyles: {
            fillColor: [252, 253, 254]
          },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center', textColor: 160 },
            1: { cellWidth: 20, fontStyle: 'bold' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: semRGB },
            5: { cellWidth: 12, halign: 'right' }
          },
          styles: {
            font: "helvetica",
            cellPadding: 2,
          }
        });

        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 12;
      });

      currentY += 5;
    });

    // Final Footer on all pages (except cover)
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(`Academic Report — Page ${i} of ${totalPages}`, 25, pageHeight - 10);
      doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - 60, pageHeight - 10);
    }

    doc.save(`academic-report-${new Date().getTime()}.pdf`);
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
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="flex-none bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 py-3 z-20 transition-colors">
        <div className="max-w-[960px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Calculator size={16} />
            </div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">GPA Calculator</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearAllData}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium transition-colors"
              title="Clear All Data"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium transition-colors"
              title="Scan Document"
            >
              <ScanLine size={14} />
              <span className="hidden sm:inline">Scan</span>
            </button>
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Grading Guide"
            >
              <Info size={16} />
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium transition-colors"
              title="Export PDF"
            >
              <FileDown size={14} />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Settings"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={handleClearAllData}
              className="sm:hidden flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Clear Data"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <Grainient
          color1="#FF9FFC"
          color2="#5227FF"
          color3="#B19EEF"
          timeSpeed={0.25}
          colorBalance={0}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated={false}
          contrast={1.5}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 pb-24">

          {/* Year Tabs — pill style */}
          <div className="sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 pt-4 pb-3 transition-colors">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {data.map((year, index) => (
                <button
                  key={year.id}
                  onClick={() => setActiveYearId(year.id)}
                  className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeYearId === year.id
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                >
                  {year.name}
                  {data.length > 1 && index !== 0 && (
                    <span
                      onClick={(e) => deleteYear(e as any, year.id)}
                      className={`ml-0.5 rounded-full transition-colors ${activeYearId === year.id
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-300 hover:text-red-500'
                        }`}
                    >
                      <X size={12} />
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={addYear}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-primary hover:bg-primary/5 dark:hover:bg-primary/10 border border-dashed border-gray-200 dark:border-gray-600 hover:border-primary/30 whitespace-nowrap transition-all"
              >
                <Plus size={12} />
                Add Year
              </button>
            </div>
          </div>

          {/* Exclude/Include toggle — compact inline */}
          {activeYear && (
            <div className={`mb-4 px-3 py-2 rounded-lg flex items-center justify-between text-xs ${activeYear.isExcluded
              ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30'
              : 'bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30'
              }`}>
              <span className={`font-medium ${activeYear.isExcluded ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {activeYear.isExcluded
                  ? 'This year is excluded from CGPA'
                  : 'This year counts toward CGPA'}
              </span>
              <button
                onClick={() => toggleYearExclusion(activeYear.id)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${activeYear.isExcluded
                  ? 'text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                  }`}
              >
                {activeYear.isExcluded ? 'Include' : 'Exclude'}
              </button>
            </div>
          )}

          {/* Semesters */}
          <div className="flex flex-col gap-6">
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
              <div className="flex justify-center pt-2 pb-6">
                <button
                  onClick={() => addSemester(activeYear.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-primary/30 transition-all"
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
      />
    </div>
  );
}

export default App;
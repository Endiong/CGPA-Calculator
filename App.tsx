import React, { useState, useEffect } from 'react';
import { Calculator, Plus, FileDown, Trash2, X, Info, ScanLine } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Year, GradingScale, Course } from './types';
import { getInitialData } from './constants';
import { calculateOverallStats, calculateSemesterStats, generateId, getGradeValue, getClassOfDegree } from './utils';
import SemesterSection from './components/SemesterSection';
import Footer from './components/Footer';
import GradingInfoModal from './components/GradingInfoModal';
import ConfirmationModal from './components/ConfirmationModal';
import AIScannerModal from './components/AIScannerModal';

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

    // Design Colors (Green "Company Profile" Theme)
    const primaryColor = [5, 150, 105] as [number, number, number]; // #059669 (Green 600)
    const secondaryColor = [209, 250, 229] as [number, number, number]; // #d1fae5 (Green 100)
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

    // --- Helper Functions ---
    const drawGeometricBackground = (yOffset: number = 0) => {
      doc.setFillColor(249, 250, 251); // Gray 50 background
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Diagonal geometric accent
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]); // Light Green
      doc.triangle(0, 0, pageWidth * 0.6, 0, 0, pageHeight * 0.4, 'F');

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]); // Dark Green Accent
      doc.rect(0, 20 + yOffset, 8, 40, 'F');
    };

    // --- COVER PAGE ---
    drawGeometricBackground();

    // Brand/Logo Area (Top Left)
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("GPA CALCULATOR", 20, 30);

    // Title Section (Center-Left)
    const titleY = pageHeight / 3;
    doc.setFontSize(40);
    doc.setFont("times", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text("ACADEMIC", 20, titleY);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("PERFORMANCE", 20, titleY + 15);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text("REPORT", 20, titleY + 30);

    // Decorative Line
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(2);
    doc.line(20, titleY + 45, 100, titleY + 45);

    // Subtitle / Abstract
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    const summaryText = "This document contains a comprehensive breakdown of academic performance, including Semester GPAs, Cumulative GPA, and degree classification status.";
    doc.text(doc.splitTextToSize(summaryText, 120), 20, titleY + 60);

    // Bottom "Prepared For" Box
    const boxY = pageHeight - 60;
    doc.setFillColor(17, 24, 39);
    doc.rect(0, boxY, pageWidth * 0.7, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("PREPARED ON", 20, boxY + 12);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(dateStr, 20, boxY + 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text("GENERATED BY", 100, boxY + 12);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Official GPA Calculator", 100, boxY + 22);

    // --- SUMMARY PAGE ---
    doc.addPage();

    // Page Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 10, pageHeight, 'F');

    let currentY = 30;

    doc.setFontSize(24);
    doc.setFont("times", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text("OVERVIEW & STATUS", 25, currentY);

    currentY += 20;

    const overall = calculateOverallStats(data, scale);
    const degreeClass = getClassOfDegree(overall.cgpa, scale);

    // Summary Cards (Grid Layout)
    const cardWidth = (pageWidth - 45) / 2;
    const cardHeight = 35;

    const drawCard = (x: number, y: number, label: string, value: string, highlight: boolean = false) => {
      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(255, 255, 255);
      if (highlight) {
        doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      }
      doc.rect(x, y, cardWidth, cardHeight, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(lightText[0], lightText[1], lightText[2]);
      doc.setFont("helvetica", "bold");
      doc.text(label.toUpperCase(), x + 5, y + 10);

      doc.setFontSize(16);
      doc.setTextColor(highlight ? primaryColor[0] : darkText[0], highlight ? primaryColor[1] : darkText[1], highlight ? primaryColor[2] : darkText[2]);
      doc.text(value, x + 5, y + 25);
    };

    drawCard(25, currentY, "Current CGPA", overall.cgpa.toFixed(2), true);
    drawCard(25 + cardWidth + 5, currentY, "Degree Class", degreeClass.toUpperCase());
    currentY += cardHeight + 5;
    drawCard(25, currentY, "Total Units", overall.grandTotalUnits.toString());
    drawCard(25 + cardWidth + 5, currentY, "Grading Scale", `${scale} Points`);

    currentY += cardHeight + 20;

    // --- DETAILED BREAKDOWN ---
    doc.setFontSize(18);
    doc.setFont("times", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text("ACADEMIC BREAKDOWN", 25, currentY);

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1);
    doc.line(25, currentY + 3, 100, currentY + 3);

    currentY += 15;

    filteredData.forEach((year) => {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 10, pageHeight, 'F');
        currentY = 30;
      }

      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(year.name.toUpperCase(), 25, currentY);
      currentY += 8;

      year.semesters.forEach((sem) => {
        const stats = calculateSemesterStats(sem.courses, scale);

        if (currentY > pageHeight - 50) {
          doc.addPage();
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(0, 0, 10, pageHeight, 'F');
          currentY = 30;
        }

        doc.setFont("times", "bold");
        doc.setFontSize(11);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text(`${sem.name} `, 25, currentY + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(lightText[0], lightText[1], lightText[2]);
        const gpaText = `(GPA: ${stats.gpa.toFixed(2)})`;
        doc.text(gpaText, 25 + doc.getTextWidth(sem.name) + 5, currentY + 6);

        currentY += 10;

        const tableBody = sem.courses
          .filter(c => (Number(c.unit) || 0) > 0)
          .map((course, index) => {
            const points = (Number(course.unit) || 0) * getGradeValue(course.grade, scale);
            return [
              index + 1,
              course.code.toUpperCase() || '-',
              course.title || '-',
              course.unit,
              course.grade,
              points.toFixed(1)
            ];
          });

        autoTable(doc, {
          startY: currentY,
          head: [['#', 'CODE', 'COURSE TITLE', 'UNIT', 'GRADE', 'PTS']],
          body: tableBody,
          theme: 'grid',
          margin: { left: 25 },
          headStyles: {
            fillColor: primaryColor,
            textColor: 255,
            fontStyle: 'bold',
            halign: 'left',
          },
          bodyStyles: {
            textColor: 50,
            lineColor: [243, 244, 246],
            lineWidth: 0.1,
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251]
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center', textColor: 150 },
            1: { cellWidth: 25, fontStyle: 'bold' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: primaryColor },
            5: { cellWidth: 15, halign: 'right' }
          },
          styles: {
            font: "helvetica",
            fontSize: 8,
            cellPadding: 3,
          }
        });

        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 10;
      });

      currentY += 5;
    });

    // Page Numbers Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1) continue; // Skip cover page
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
    }

    doc.save("academic-report.pdf");
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#f3f4f6]">
      {/* Top Header */}
      <header className="flex-none bg-white border-b border-[#e5e7eb] px-6 py-3 z-20 shadow-sm">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Calculator size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-[#111418]">GPA Calculator</h1>
              <p className="text-xs text-gray-500 font-medium">Academic Performance Tracker</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* Clear All Data Button */}
            <button
              onClick={handleClearAllData}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-medium text-sm transition-colors mr-2"
              title="Reset Application"
            >
              <Trash2 size={16} />
              <span>Clear Data</span>
            </button>

            {/* AI Scan Button */}
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors border border-gray-200"
              title="Scan Document with AI"
            >
              <ScanLine size={16} />
              <span className="hidden sm:inline">Scan</span>
            </button>

            {/* Info Button */}
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="flex items-center justify-center size-10 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              title="Grading System Guide"
            >
              <Info size={20} />
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors border border-gray-200"
              title="Export Data to PDF"
            >
              <FileDown size={18} />
              <span className="hidden sm:inline">Export PDF</span>
            </button>

            {/* Mobile Only Trash Icon for Clear All */}
            <button
              onClick={handleClearAllData}
              className="md:hidden flex items-center justify-center size-10 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              title="Clear Data"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-32">
          {/* Tabs */}
          <div className="sticky top-0 bg-[#f3f4f6] z-10 pt-6 pb-2">
            <div className="flex items-center justify-between border-b border-gray-200">
              <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1 items-end">
                {data.map((year, index) => (
                  <div
                    key={year.id}
                    onClick={() => setActiveYearId(year.id)}
                    className={`group relative flex items-center gap-2 border-b-[3px] px-4 pb-3 transition-colors cursor-pointer select-none ${activeYearId === year.id
                      ? 'border-primary text-[#111418]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}>
                    <span className="text-sm font-bold whitespace-nowrap">{year.name}</span>
                    {/* Remove Year Button - Always visible if year > 1 AND it's not the first year */}
                    {data.length > 1 && index !== 0 && (
                      <button
                        onClick={(e) => deleteYear(e, year.id)}
                        className={`p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors`}
                        title="Remove Year"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}


                <button
                  onClick={addYear}
                  className="flex items-center gap-1.5 px-4 pb-3 text-sm font-bold text-primary hover:text-primary-dark transition-colors border-b-[3px] border-transparent"
                >
                  <Plus size={16} />
                  <span>Add Year</span>
                </button>
              </div>
            </div>
          </div>

          {/* Semesters List */}
          <div className="mt-6 space-y-2">

            {/* Year Status Banner */}
            {activeYear && (
              <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between transition-colors ${activeYear.isExcluded
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-full flex items-center justify-center ${activeYear.isExcluded ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                    }`}>
                    {activeYear.isExcluded ? <Info size={20} /> : <Calculator size={20} />}
                  </div>
                  <div>
                    <h3 className={`font-bold ${activeYear.isExcluded ? 'text-yellow-900' : 'text-green-900'}`}>
                      {activeYear.isExcluded ? "Year Excluded" : "Year Included"}
                    </h3>
                    <p className={`text-sm ${activeYear.isExcluded ? 'text-yellow-700' : 'text-green-700'}`}>
                      {activeYear.isExcluded
                        ? "Grades in this year are ignored in your final CGPA."
                        : "Grades in this year count towards your final CGPA."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleYearExclusion(activeYear.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${activeYear.isExcluded
                      ? 'bg-white border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                      : 'bg-white border-green-300 text-green-700 hover:bg-green-100'
                      }`}
                  >
                    {activeYear.isExcluded ? "Include Year" : "Exclude Year"}
                  </button>
                </div>
              </div>
            )}

            {activeYear && activeYear.semesters.map((semester) => (
              <SemesterSection
                key={semester.id}
                semester={semester}
                scale={scale}
                onAddCourse={addCourse}
                onUpdateCourse={updateCourse}
                onDeleteCourse={deleteCourse}
                onDeleteSemester={deleteSemester}
              />
            ))}

            {activeYear && (
              <div className="flex justify-center mt-4 mb-10">
                <button
                  onClick={() => addSemester(activeYear.id)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 shadow-sm text-gray-600 font-semibold hover:bg-gray-50 hover:text-primary hover:border-primary/30 transition-all"
                >
                  <Plus size={18} />
                  Add Another Semester
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Stats */}
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

      {/* AI Scanner Modal */}
      <AIScannerModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onImport={handleAIImport}
        semesters={activeYear.semesters}
      />
    </div>
  );
}

export default App;
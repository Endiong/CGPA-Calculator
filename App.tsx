import React, { useState, useEffect } from 'react';
import { Calculator, Plus, FileDown, Trash2, X, Info, GripVertical, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Year, GradingScale, Course } from './types';
import { getInitialData } from './constants';
import { calculateOverallStats, calculateSemesterStats, generateId, getGradeValue, getClassOfDegree } from './utils';
import SemesterSection from './components/SemesterSection';
import Footer from './components/Footer';
import GradingInfoModal from './components/GradingInfoModal';
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
  
  // Renaming State
  const [editingYearId, setEditingYearId] = useState<string | null>(null);
  const [tempYearName, setTempYearName] = useState('');

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('gpa_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem('gpa_scale', scale);
  }, [scale]);

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
    if (!window.confirm("CRITICAL WARNING: This will completely wipe all your data including all years and courses. This action cannot be undone. Are you sure?")) {
      return;
    }
    const freshData = getInitialData();
    setData(freshData);
    setActiveYearId(freshData[0].id);
  };

  const deleteYear = (e: React.MouseEvent, yearId: string) => {
    e.stopPropagation(); // Prevent tab switching when clicking delete
    
    // Safety check: Cannot delete if it's the only year (though UI hides button)
    if (data.length <= 1) {
      alert("You cannot delete the only remaining year.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this entire year?")) {
      return;
    }

    const newData = data.filter(y => y.id !== yearId);
    setData(newData);
    
    // If we deleted the active year, switch to the first available one
    if (yearId === activeYearId) {
      setActiveYearId(newData[0].id);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    if (!sourceIndexStr) return;
    
    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (sourceIndex === targetIndex) return;

    const newData = [...data];
    const [movedItem] = newData.splice(sourceIndex, 1);
    newData.splice(targetIndex, 0, movedItem);
    
    setData(newData);
  };

  // Rename Handlers
  const startEditing = (year: Year) => {
    setEditingYearId(year.id);
    setTempYearName(year.name);
  };

  const saveYearName = () => {
    if (editingYearId && tempYearName.trim()) {
      setData(prev => prev.map(y => y.id === editingYearId ? { ...y, name: tempYearName.trim() } : y));
    }
    setEditingYearId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveYearName();
    } else if (e.key === 'Escape') {
      setEditingYearId(null);
    }
  };

  // PDF Export Logic
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const primaryColor = [19, 127, 236] as [number, number, number]; // #137fec
    
    // -- Custom Header --
    // Logo bg
    doc.setFillColor(...primaryColor);
    doc.roundedRect(margin, 15, 12, 12, 3, 3, 'F');
    
    // Logo Icon (simplified calculator look)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("+/-", margin + 2.5, 22.5);

    // App Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55); // Gray 800
    doc.text("GPA Calculator", margin + 18, 24);

    // Report Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray 500
    const dateStr = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    const dateWidth = doc.getTextWidth(dateStr);
    doc.text(dateStr, pageWidth - margin - dateWidth, 24);

    // Divider
    doc.setDrawColor(229, 231, 235); // Gray 200
    doc.setLineWidth(0.5);
    doc.line(margin, 35, pageWidth - margin, 35);

    // -- Summary Section --
    const overall = calculateOverallStats(data, scale);
    const degreeClass = getClassOfDegree(overall.cgpa, scale);
    let finalY = 45;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 41, 55);
    doc.text("Academic Summary", margin, finalY);
    
    finalY += 5;

    autoTable(doc, {
        startY: finalY,
        head: [['Metric', 'Value']],
        body: [
            ['Grading System', `${scale} Scale`],
            ['Degree Classification', degreeClass.toUpperCase()],
            ['Total Units', `${overall.grandTotalUnits}`],
            ['Total Points', `${overall.grandTotalPoints.toFixed(2)}`],
            ['Cumulative GPA', `${overall.cgpa.toFixed(2)}`]
        ],
        theme: 'grid',
        headStyles: { 
            fillColor: primaryColor, 
            textColor: 255,
            fontStyle: 'bold',
            halign: 'left'
        },
        bodyStyles: {
            textColor: 50,
            lineColor: [229, 231, 235], // Gray 200
        },
        columnStyles: {
            0: { cellWidth: 80, fontStyle: 'bold', fillColor: [249, 250, 251] }, // Gray 50
            1: { cellWidth: 'auto', fontStyle: 'normal' }
        },
        styles: { fontSize: 10, cellPadding: 4 },
    });

    // @ts-ignore
    finalY = doc.lastAutoTable.finalY + 15;

    // -- Detailed Breakdown --
    data.forEach((year) => {
        // Check for page break
        if (finalY > pageHeight - 30) {
            doc.addPage();
            finalY = 20;
        }

        // Year Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text(year.name.toUpperCase(), margin, finalY);
        
        // Year Divider
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.line(margin, finalY + 2, pageWidth - margin, finalY + 2);
        finalY += 10;

        year.semesters.forEach((sem) => {
            const stats = calculateSemesterStats(sem.courses, scale);
            
            // Check for page break before semester
            if (finalY > pageHeight - 40) {
                doc.addPage();
                finalY = 20;
            }

            // Semester Row Header (Name + GPA)
            doc.setFillColor(243, 244, 246); // Gray 100
            doc.roundedRect(margin, finalY - 4, pageWidth - (margin * 2), 8, 1, 1, 'F');
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(55, 65, 81); // Gray 700
            doc.text(`${sem.name}`, margin + 3, finalY + 1.5);
            
            doc.setFont("helvetica", "normal");
            const gpaText = `GPA: ${stats.gpa.toFixed(2)}`;
            const gpaWidth = doc.getTextWidth(gpaText);
            doc.text(gpaText, pageWidth - margin - gpaWidth - 3, finalY + 1.5);
            
            finalY += 8;

            // Table Data
            const tableBody = sem.courses
                .filter(c => c.code || c.title || (c.unit && c.unit > 0)) // Only show rows with data in PDF
                .map((course, index) => {
                const points = (Number(course.unit) || 0) * getGradeValue(course.grade, scale);
                return [
                    index + 1,
                    course.code.toUpperCase(),
                    course.title,
                    course.unit || '-',
                    course.grade,
                    points.toFixed(1)
                ];
            });

            if (tableBody.length === 0) {
                doc.setFont("helvetica", "italic");
                doc.setFontSize(9);
                doc.setTextColor(156, 163, 175); // Gray 400
                doc.text("No courses recorded.", margin + 5, finalY + 5);
                finalY += 12;
            } else {
                autoTable(doc, {
                    startY: finalY,
                    head: [['#', 'Code', 'Course Title', 'Unit', 'Grade', 'Points']],
                    body: tableBody,
                    theme: 'striped',
                    headStyles: { 
                        fillColor: primaryColor,
                        textColor: 255,
                        halign: 'left',
                        fontStyle: 'bold'
                    },
                    styles: { 
                        fontSize: 9, 
                        cellPadding: 3,
                        lineColor: [229, 231, 235],
                        lineWidth: 0.1
                    },
                    alternateRowStyles: { 
                        fillColor: [239, 246, 255] // Blue 50
                    },
                    columnStyles: {
                        0: { cellWidth: 10, halign: 'center', textColor: 100 },
                        1: { cellWidth: 30, fontStyle: 'bold' },
                        2: { cellWidth: 'auto' },
                        3: { cellWidth: 15, halign: 'center' },
                        4: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                        5: { cellWidth: 20, halign: 'right' }
                    },
                    margin: { left: margin, right: margin },
                });

                // @ts-ignore
                finalY = doc.lastAutoTable.finalY + 10;
            }
        });
        
        finalY += 5; // Spacing between years
    });

    // Footer with numbering
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // Gray 400
        
        // Footer Divider
        doc.setDrawColor(229, 231, 235);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        
        // Footer Text
        doc.text("Generated by GPA Calculator", margin, pageHeight - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 7);
    }

    doc.save("gpa-report.pdf");
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

  // AI Import Logic
  const handleAIImport = (newCourses: Course[], semesterId: string) => {
    setData((prevData) =>
      prevData.map((year) => {
        // If the semester is in this year, update it
        const hasSemester = year.semesters.some(s => s.id === semesterId);
        if (!hasSemester) return year;

        return {
          ...year,
          semesters: year.semesters.map((sem) => {
            if (sem.id === semesterId) {
              // Remove empty placeholders if we are importing real data
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm transition-all shadow-md shadow-blue-200"
                title="Scan Result with AI"
            >
               <Sparkles size={16} />
               <span className="hidden sm:inline">AI Scan</span>
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
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onClick={() => setActiveYearId(year.id)}
                        className={`group relative flex items-center gap-2 border-b-[3px] px-4 pb-3 transition-colors cursor-pointer select-none ${
                        activeYearId === year.id
                        ? 'border-primary text-[#111418] bg-white rounded-t-lg'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}>
                        {/* Drag Handle (visible on hover) */}
                        <div className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-300 transition-opacity">
                            <GripVertical size={14} />
                        </div>

                        {/* Editable Name */}
                        {editingYearId === year.id ? (
                          <input 
                            autoFocus
                            type="text" 
                            value={tempYearName}
                            onChange={(e) => setTempYearName(e.target.value)}
                            onBlur={saveYearName}
                            onKeyDown={handleKeyDown}
                            className="w-24 px-1 py-0.5 text-sm font-bold border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span 
                            onDoubleClick={() => startEditing(year)}
                            className="text-sm font-bold whitespace-nowrap"
                            title="Double click to rename"
                          >
                            {year.name}
                          </span>
                        )}

                        {/* Remove Year Button - HIDDEN for the FIRST TAB (index 0) */}
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
            {activeYear && activeYear.semesters.map((semester) => (
              <SemesterSection
                key={semester.id}
                semester={semester}
                scale={scale}
                onAddCourse={addCourse}
                onUpdateCourse={updateCourse}
                onDeleteCourse={deleteCourse}
              />
            ))}
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
      
      {/* Info Modal */}
      <GradingInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />

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
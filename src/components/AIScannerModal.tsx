import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, AlertCircle, Camera, Trash2, Plus, Check, ChevronDown } from 'lucide-react';
import { Course, GradeLetter, Semester } from '../types';
import { generateId } from '../utils';

// ── Types ──
interface AIScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (courses: Course[], semesterId: string) => void;
  semesters: Semester[];
  viewMode: 'table' | 'card';
}

// ── Constants ──
const GRADE_OPTIONS: GradeLetter[] = ['A', 'B', 'C', 'D', 'E', 'F'];
const API_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SCAN_PROMPT = `Analyze this image. Determine if it is an academic document such as a result sheet, course registration form, transcript, or similar.

If it is NOT an academic document, return an empty JSON array: []

If it IS an academic document, extract all courses listed. Return ONLY a valid JSON array where each object has:
- "code" (Course Code, e.g., MTH101)
- "title" (Course Title, if visible)
- "unit" (Credit Unit/Load, number)
- "grade" (Letter Grade: A, B, C, D, E, or F — use empty string "" if no grade is shown)

Rules:
1. If letter grades are visible, use them directly.
2. If only numerical scores are present, convert using: A=70-100, B=60-69, C=50-59, D=45-49, E=40-44, F=0-39.
3. If this is a course registration form with NO grades/scores, set grade to "".
4. Ignore headers, student info, and footer text.
5. If you cannot identify any courses, return an empty array.
6. Return ONLY the JSON array. No markdown, no code fences, just the raw JSON array.`;

// ── Helpers ──
const validateGrade = (input: string): GradeLetter => {
  if (!input || input.trim() === '') return 'A';
  const upper = input.toUpperCase().trim().charAt(0);
  return GRADE_OPTIONS.includes(upper as GradeLetter) ? (upper as GradeLetter) : 'A';
};

const GradeSelect: React.FC<{
  value: GradeLetter;
  onChange: (val: GradeLetter) => void;
  className?: string;
}> = ({ value, onChange, className = '' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as GradeLetter)}
    className={`font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 outline-none focus:ring-1 focus:ring-gray-400/30 cursor-pointer transition-colors ${className}`}
  >
    {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
  </select>
);

// ── Main Component ──
const AIScannerModal: React.FC<AIScannerModalProps> = ({ isOpen, onClose, onImport, semesters, viewMode }) => {
  // State
  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedCourses, setExtractedCourses] = useState<Course[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Camera ──
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch {
      setError('Could not access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    setImagePreview(dataUrl);
    scanDocument(dataUrl.split(',')[1], 'image/jpeg');
  };

  // ── File Upload ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image (JPG, PNG, or WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      scanDocument(base64.split(',')[1], file.type);
    };
    reader.readAsDataURL(file);
  };

  // ── AI Scanning ──
  const scanDocument = async (base64Data: string, mimeType: string) => {
    setStep('scanning');
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error('Missing API Key. Add VITE_GROQ_API_KEY to your .env.local file.');

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: API_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: SCAN_PROMPT },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
            ]
          }],
          temperature: 0.1,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || '';
      if (!rawText) throw new Error('No data returned from AI.');

      // Parse response — handle both raw array and wrapped formats
      let parsed: any[];
      try {
        const json = JSON.parse(rawText);
        parsed = Array.isArray(json) ? json : (json.courses || json.data || []);
      } catch {
        const match = rawText.match(/\[[\s\S]*\]/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('Could not parse AI response.');
      }

      const courses: Course[] = parsed.map((item: any) => ({
        id: generateId(),
        code: item.code?.toUpperCase() || '',
        title: item.title || '',
        unit: Number(item.unit) || 0,
        grade: validateGrade(item.grade)
      }));

      if (courses.length === 0) {
        throw new Error("No courses found. Make sure you're uploading a result sheet, transcript, or course registration form.");
      }

      setExtractedCourses(courses);
      setStep('review');
    } catch (err: any) {
      let msg = err.message || 'Failed to analyze document.';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = 'Network error — check your internet connection and try again.';
      } else if (msg.includes('API key') || msg.includes('API_KEY')) {
        msg = 'API key issue. Make sure VITE_GROQ_API_KEY is set in your .env.local file.';
      }
      setError(msg);
      setStep('upload');
    }
  };

  // ── Course Management ──
  const updateCourse = (id: string, field: keyof Course, value: string | number) => {
    setExtractedCourses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCourse = (id: string) => {
    setExtractedCourses(prev => prev.filter(c => c.id !== id));
  };

  const addEmptyRow = () => {
    setExtractedCourses(prev => [...prev, { id: generateId(), code: '', title: '', unit: 0, grade: 'A' }]);
  };

  // ── Lifecycle ──
  const reset = () => {
    stopCamera();
    setStep('upload');
    setImagePreview(null);
    setExtractedCourses([]);
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleImportConfirm = () => {
    if (!selectedSemesterId) { setError('Please select a target semester.'); return; }
    const valid = extractedCourses.filter(c => c.code.trim() !== '' || c.unit > 0);
    if (valid.length === 0) { setError('No valid courses to import.'); return; }
    onImport(valid, selectedSemesterId);
    handleClose();
  };

  // Effects
  useEffect(() => {
    if (isOpen && semesters.length > 0 && !selectedSemesterId) setSelectedSemesterId(semesters[0].id);
  }, [semesters, isOpen]);

  useEffect(() => () => { stopCamera(); }, []);

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [isCameraActive]);

  if (!isOpen) return null;

  // ── Render ──
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={handleClose} />

      <div className="bg-white dark:bg-[#1a1a24] w-full sm:rounded-2xl sm:max-w-lg sm:mx-4 rounded-t-2xl shadow-2xl relative z-10 flex flex-col max-h-[92vh] sm:max-h-[85vh] transition-colors">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {step === 'review' ? 'Review Courses' : 'Scan Document'}
          </h2>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Semester Selector */}
          {step !== 'scanning' && (
            <div className="px-5 pt-4 pb-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-1.5 block">Import to</label>
              <div className="relative">
                <select
                  value={selectedSemesterId}
                  onChange={(e) => setSelectedSemesterId(e.target.value)}
                  className="w-full appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-3 pr-10 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-400 transition-colors"
                >
                  {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mx-5 mt-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Step */}
          {step === 'upload' && !isCameraActive && (
            <div className="px-5 py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Upload a result sheet, course form, or transcript. AI will extract the courses.
              </p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all cursor-pointer flex flex-col items-center text-center"
              >
                <div className="size-12 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center mb-3">
                  <Upload size={22} />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tap to upload file</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, or WebP</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <button
                onClick={startCamera}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Camera size={16} />
                Use Camera
              </button>
            </div>
          )}

          {/* Camera Step */}
          {step === 'upload' && isCameraActive && (
            <div className="px-5 py-4">
              <div className="relative w-full bg-black rounded-xl overflow-hidden aspect-[3/4] sm:aspect-video mb-3">
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-2">
                <button onClick={stopCamera} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Cancel
                </button>
                <button onClick={capturePhoto} className="flex-1 py-2.5 text-sm font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                  <Camera size={16} />
                  Capture
                </button>
              </div>
            </div>
          )}

          {/* Scanning Step */}
          {step === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-14 px-5">
              <style>{`
                @keyframes material-progress {
                  0% { transform: translateX(-100%) scaleX(0.1); }
                  25% { transform: translateX(-30%) scaleX(0.4); }
                  50% { transform: translateX(40%) scaleX(0.5); }
                  75% { transform: translateX(80%) scaleX(0.4); }
                  100% { transform: translateX(100%) scaleX(0.1); }
                }
                @keyframes material-progress-2 {
                  0% { transform: translateX(-200%) scaleX(0.1); }
                  35% { transform: translateX(-50%) scaleX(0.6); }
                  70% { transform: translateX(50%) scaleX(0.5); }
                  100% { transform: translateX(150%) scaleX(0.1); }
                }
                @keyframes scanner-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
              `}</style>

              <div className="mb-6" style={{ animation: 'scanner-float 2s ease-in-out infinite' }}>
                <div className="size-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="text-gray-700 dark:text-gray-300">
                    <path d="M4 18H32M4 10H16M4 26H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="26" cy="26" r="6" stroke="currentColor" strokeWidth="2" />
                    <path d="M23 26l2 2 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Analyzing document...</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">AI is reading your document. This usually takes a few seconds.</p>

              <div className="w-full max-w-xs h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 w-full bg-gray-800 dark:bg-white rounded-full" style={{ animation: 'material-progress 1.8s cubic-bezier(0.4,0,0.2,1) infinite', transformOrigin: 'left center' }} />
                <div className="absolute inset-y-0 left-0 w-full bg-gray-600 dark:bg-gray-300 rounded-full" style={{ animation: 'material-progress-2 1.8s cubic-bezier(0.4,0,0.2,1) 0.3s infinite', transformOrigin: 'left center' }} />
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <div className="px-5 py-4">
              {/* Summary */}
              <div className="flex items-center gap-2 mb-4">
                <div className="size-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Check size={14} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {extractedCourses.length} course{extractedCourses.length !== 1 ? 's' : ''} found
                </span>
              </div>

              {/* Editable Course List */}
              <div className="mb-4 max-h-[45vh] overflow-y-auto pr-1">
                {viewMode === 'table' ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase text-left py-2 w-6">S/N</th>
                        <th className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase text-left py-2">Code</th>
                        <th className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase text-left py-2">Title</th>
                        <th className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase text-center py-2 w-14">Unit</th>
                        <th className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase text-center py-2 w-16">Grade</th>
                        <th className="py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedCourses.map((c, i) => (
                        <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/50 group hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                          <td className="py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500">{i + 1}</td>
                          <td className="py-2 pr-2">
                            <input type="text" value={c.code} onChange={(e) => updateCourse(c.id, 'code', e.target.value)} onFocus={(e) => e.target.select()} className="w-full text-xs font-bold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none uppercase placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:normal-case" placeholder="CODE" />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="text" value={c.title} onChange={(e) => updateCourse(c.id, 'title', e.target.value)} onFocus={(e) => e.target.select()} className="w-full text-xs text-gray-600 dark:text-gray-400 bg-transparent border-none outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600" placeholder="Course title" />
                          </td>
                          <td className="py-2 w-14">
                            <input type="number" min="0" value={c.unit || ''} onChange={(e) => updateCourse(c.id, 'unit', parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-12 text-xs text-center font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded py-1 outline-none focus:ring-1 focus:ring-gray-400/30" />
                          </td>
                          <td className="py-2 w-16">
                            <GradeSelect value={c.grade} onChange={(v) => updateCourse(c.id, 'grade', v)} className="w-14 text-xs text-center rounded py-1" />
                          </td>
                          <td className="py-2">
                            <button onClick={() => removeCourse(c.id)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="space-y-2">
                    {extractedCourses.map((c, i) => (
                      <div key={c.id} className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3 border border-gray-100 dark:border-gray-700 transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 w-5 shrink-0">{i + 1}</span>
                            <input type="text" value={c.code} onChange={(e) => updateCourse(c.id, 'code', e.target.value)} onFocus={(e) => e.target.select()} className="text-sm font-bold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none w-full uppercase placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:normal-case" placeholder="Course code" />
                          </div>
                          <button onClick={() => removeCourse(c.id)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input type="text" value={c.title} onChange={(e) => updateCourse(c.id, 'title', e.target.value)} onFocus={(e) => e.target.select()} className="text-xs text-gray-500 dark:text-gray-400 bg-transparent border-none outline-none w-full mb-2 placeholder:text-gray-300 dark:placeholder:text-gray-600" placeholder="Course title (optional)" />
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Units</span>
                            <input type="number" min="0" value={c.unit || ''} onChange={(e) => updateCourse(c.id, 'unit', parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-12 text-sm text-center font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md py-1 outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Grade</span>
                            <GradeSelect value={c.grade} onChange={(v) => updateCourse(c.id, 'grade', v)} className="text-sm rounded-md py-1 px-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {extractedCourses.length === 0 && (
                  <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                    No courses yet. Add one below.
                  </div>
                )}
              </div>

              {/* Add Course */}
              <button
                onClick={addEmptyRow}
                className="w-full py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5 mb-4"
              >
                <Plus size={14} />
                Add Course
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'review' && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/50 flex gap-2 bg-white dark:bg-[#1a1a24] rounded-b-2xl">
            <button onClick={reset} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Scan Again
            </button>
            <button
              onClick={handleImportConfirm}
              disabled={extractedCourses.length === 0}
              className="flex-1 py-2.5 text-sm font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import {extractedCourses.length > 0 ? `(${extractedCourses.length})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIScannerModal;
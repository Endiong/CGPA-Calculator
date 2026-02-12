import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Sparkles, AlertCircle, Check, Loader2, Camera, Trash2, Settings2 } from 'lucide-react';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Course, GradeLetter, Semester } from '../types';
import { generateId } from '../utils';

interface AIScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (courses: Course[], semesterId: string) => void;
  semesters: Semester[];
}

const AIScannerModal: React.FC<AIScannerModalProps> = ({ isOpen, onClose, onImport, semesters }) => {
  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedCourses, setExtractedCourses] = useState<Course[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [gradingHint, setGradingHint] = useState<'standard' | 'us'>('standard');
  const [error, setError] = useState<string | null>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define stopCamera before any useEffect or early return that references it
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Set default semester when modal opens or semesters change
  useEffect(() => {
    if (semesters.length > 0 && !selectedSemesterId) {
      setSelectedSemesterId(semesters[0].id);
    }
  }, [semesters, isOpen]);

  // Cleanup camera on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Attach stream to video element when camera is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  if (!isOpen) return null;

  const reset = () => {
    stopCamera();
    setStep('upload');
    setImagePreview(null);
    setExtractedCourses([]);
    setError(null);
    if (semesters.length > 0) setSelectedSemesterId(semesters[0].id);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err: any) {
      console.error(err);
      setError("Could not access camera. Please check permissions or use the upload option.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        stopCamera();
        setImagePreview(dataUrl);
        scanDocument(dataUrl.split(',')[1], 'image/jpeg');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      setError('Please upload an image (JPG, PNG) or PDF document.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      scanDocument(base64String.split(',')[1], file.type);
    };
    reader.readAsDataURL(file);
  };

  const scanDocument = async (base64Data: string, mimeType: string) => {
    setStep('scanning');
    setError(null);

    const gradingRules = gradingHint === 'standard'
      ? "A=70-100, B=60-69, C=50-59, D=45-49, E=40-44, F=0-39"
      : "A=90-100, B=80-89, C=70-79, D=60-69, F=0-59";

    try {
      if (!import.meta.env.VITE_GOOGLE_API_KEY) {
        throw new Error("Missing Google API Key. Please add VITE_GOOGLE_API_KEY to your env.");
      }

      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                code: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                unit: { type: SchemaType.NUMBER },
                grade: { type: SchemaType.STRING },
              },
              required: ["code", "unit", "grade"]
            }
          }
        }
      });

      const prompt = `Analyze this academic result document. It may be an image or a PDF. Extract the courses listed. 
                     Return a JSON array where each object has:
                     - 'code' (Course Code, e.g., MTH101)
                     - 'title' (Course Title)
                     - 'unit' (Credit Unit/Load, number)
                     - 'grade' (Letter Grade: A, B, C, D, E, or F). 
                     
                     Extraction Logic:
                     1. FIRST, look for a grading key/legend. If found, use it to convert scores to Letter Grades.
                     2. If Letter Grades are directly visible, use them.
                     3. If ONLY numerical scores are present, convert them using: ${gradingRules}.
                     
                     Ignore header information, student details, or footer text.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ]);

      const rawText = result.response.text();
      if (!rawText) throw new Error("No data returned from AI");

      const parsedData = JSON.parse(rawText);

      const courses: Course[] = parsedData.map((item: any) => ({
        id: generateId(),
        code: item.code?.toUpperCase() || '',
        title: item.title || '',
        unit: Number(item.unit) || 0,
        grade: validateGrade(item.grade)
      }));

      if (courses.length === 0) {
        throw new Error("No legible courses found in the document.");
      }

      setExtractedCourses(courses);
      setStep('review');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze document.");
      setStep('upload');
    }
  };

  const validateGrade = (input: string): GradeLetter => {
    const valid = ['A', 'B', 'C', 'D', 'E', 'F'];
    const upper = input?.toUpperCase().trim().charAt(0);
    return valid.includes(upper) ? (upper as GradeLetter) : 'A';
  };

  const updateCourse = (id: string, field: keyof Course, value: string | number) => {
    setExtractedCourses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCourse = (id: string) => {
    setExtractedCourses(prev => prev.filter(c => c.id !== id));
  };

  const handleImportConfirm = () => {
    if (!selectedSemesterId) {
      setError("Please select a target semester.");
      return;
    }
    onImport(extractedCourses, selectedSemesterId);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={handleClose}></div>

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative z-10 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles size={20} />
            <h2 className="text-lg font-bold text-gray-900">AI Result Scanner</h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'upload' && !isCameraActive && (
            <div className="text-center py-2">
              <p className="text-gray-600 mb-6 text-sm">
                Take a photo or upload a file (Image/PDF) of your results. AI will extract the courses for you.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group flex flex-col items-center justify-center bg-gray-50"
              >
                <div className="size-14 rounded-full bg-blue-100 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                  <Upload size={28} />
                </div>
                <h3 className="font-bold text-gray-700 mb-1">Click to Upload File</h3>
                <p className="text-xs text-gray-400">Supported: JPG, PNG, PDF</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                />
              </div>

              <div className="mt-4 flex flex-col items-center">
                <button
                  onClick={startCamera}
                  className="w-full max-w-xs flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm shadow-lg shadow-gray-200"
                >
                  <Camera size={18} />
                  Open Camera
                </button>
              </div>

              {/* Grading Hint Selector */}
              <div className="mt-6 p-3 bg-blue-50/50 rounded-lg border border-blue-100 max-w-xs mx-auto text-left">
                <div className="flex items-center gap-2 mb-2 text-blue-800">
                  <Settings2 size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Grading System Hint</span>
                </div>
                <select
                  value={gradingHint}
                  onChange={(e) => setGradingHint(e.target.value as any)}
                  className="w-full text-sm bg-white border border-blue-200 rounded-md py-1.5 px-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 outline-none"
                >
                  <option value="standard">Standard (A = 70+)</option>
                  <option value="us">US / North American (A = 90+)</option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1.5 leading-tight">
                  Select if no key is found on document.
                </p>
              </div>
            </div>
          )}

          {step === 'upload' && isCameraActive && (
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-md bg-black rounded-lg overflow-hidden aspect-[3/4] md:aspect-video mb-4 shadow-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-4 w-full max-w-md">
                <button
                  onClick={stopCamera}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                >
                  <Camera size={20} />
                  Capture
                </button>
              </div>
            </div>
          )}

          {step === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-white p-6 rounded-full shadow-lg border border-gray-100">
                  <Loader2 size={48} className="text-primary animate-spin" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing...</h3>
              <p className="text-sm text-gray-500 max-w-xs text-center">
                We're extracting details using the <strong>{gradingHint === 'standard' ? 'Standard' : 'US'}</strong> grading context.
              </p>
            </div>
          )}

          {step === 'review' && (
            <div>
              {/* Semester Selector */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Check className="text-green-600" size={20} />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Found {extractedCourses.length} Courses</h3>
                    <p className="text-xs text-gray-500">Review and edit before importing</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Import to:</label>
                  <select
                    value={selectedSemesterId}
                    onChange={(e) => setSelectedSemesterId(e.target.value)}
                    className="text-sm border-gray-300 rounded-md focus:ring-primary focus:border-primary py-1.5 pl-2 pr-8"
                  >
                    {semesters.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Editable Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-6 max-h-[350px] overflow-y-auto shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-semibold text-xs sticky top-0 z-10 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 border-b border-gray-200 w-12">#</th>
                      <th className="px-4 py-3 border-b border-gray-200">Code</th>
                      <th className="px-4 py-3 border-b border-gray-200 w-24">Unit</th>
                      <th className="px-4 py-3 border-b border-gray-200 w-24">Grade</th>
                      <th className="px-4 py-3 border-b border-gray-200 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {extractedCourses.map((c, index) => (
                      <tr key={c.id} className="group hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 text-gray-400 font-mono text-xs">{index + 1}</td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={c.code}
                            onChange={(e) => updateCourse(c.id, 'code', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 font-medium text-gray-900 uppercase"
                            placeholder="CODE"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            value={c.unit}
                            onChange={(e) => updateCourse(c.id, 'unit', parseInt(e.target.value) || 0)}
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-gray-700"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={c.grade}
                            onChange={(e) => updateCourse(c.id, 'grade', e.target.value)}
                            className="w-full bg-transparent border-none text-sm font-bold text-gray-900 focus:ring-0 cursor-pointer py-1"
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                            <option value="E">E</option>
                            <option value="F">F</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => removeCourse(c.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                            title="Remove row"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {extractedCourses.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">All courses removed.</div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Scan New
                </button>
                <button
                  onClick={handleImportConfirm}
                  disabled={extractedCourses.length === 0}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import Courses
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIScannerModal;
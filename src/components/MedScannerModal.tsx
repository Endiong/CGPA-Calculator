import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, AlertCircle, Camera, Trash2, Plus, Check } from 'lucide-react';
import { MedSubject, MedYear } from '../types';
import { generateId } from '../utils';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MedScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeYear: MedYear;
    onImport: (subjects: MedSubject[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MED_SCAN_PROMPT = `Analyze this academic result sheet from a medical/MBBS program.

Extract EVERY subject listed. For each subject, determine:
- "name": The subject or course name (e.g. Anatomy, Physiology, Surgery)
- "ca": The Continuous Assessment score (out of 30). If not found, leave null.
- "exam": The professional examination score (out of 70). If not found, leave null.

Rules:
1. CA scores should be between 0 and 30.
2. Exam scores should be between 0 and 70.
3. If only a total score (out of 100) is shown with no breakdown, try to infer from context. If you cannot, set both ca and exam to null.
4. If a percentage or score out of 100 is given and labeled as total/aggregate, you may split proportionally (ca = total*0.3, exam = total*0.7) if no breakdown is available.
5. Ignore student info, headers, and footers.
6. Return ONLY a valid JSON array. No markdown, no code fences, no explanation text.

Example output:
[{"name":"Anatomy","ca":22,"exam":58},{"name":"Physiology","ca":18,"exam":null}]

If this is not a medical result sheet, return: []`;

// ─── Component ────────────────────────────────────────────────────────────────

const MedScannerModal: React.FC<MedScannerModalProps> = ({ isOpen, onClose, activeYear, onImport }) => {
    const [step, setStep]               = useState<'upload' | 'scanning' | 'review'>('upload');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [extracted, setExtracted]     = useState<MedSubject[]>([]);
    const [error, setError]             = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const videoRef    = useRef<HTMLVideoElement>(null);
    const canvasRef   = useRef<HTMLCanvasElement>(null);
    const streamRef   = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Camera ────────────────────────────────────────────────────────────────

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
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

    // ── File Upload ───────────────────────────────────────────────────────────

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
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                const maxDim = 1500;
                if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
                else if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                setImagePreview(dataUrl);
                scanDocument(dataUrl.split(',')[1], 'image/jpeg');
            };
            img.onerror = () => setError('Failed to read image file.');
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    };

    // ── AI Scan ───────────────────────────────────────────────────────────────

    const scanDocument = async (base64Data: string, mimeType: string) => {
        setStep('scanning');
        setError(null);

        try {
            const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
            const groqKey   = import.meta.env.VITE_GROQ_API_KEY;

            if (!geminiKey && !groqKey) {
                throw new Error('Missing API Key. Add VITE_GEMINI_API_KEY or VITE_GROQ_API_KEY to your .env.local file.');
            }

            let rawText = '';

            if (geminiKey) {
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent([
                    MED_SCAN_PROMPT,
                    { inlineData: { data: base64Data, mimeType } }
                ]);
                rawText = result.response.text();
            } else {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: API_MODEL,
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'text', text: MED_SCAN_PROMPT },
                                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
                            ]
                        }],
                        temperature: 0.1, max_tokens: 4096,
                        response_format: { type: 'json_object' }
                    })
                });
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData?.error?.message || `API error: ${response.status}`);
                }
                const data = await response.json();
                rawText = data.choices?.[0]?.message?.content || '';
            }

            if (!rawText) throw new Error('No data returned from AI.');

            // Parse
            let parsed: any[];
            try {
                const json = JSON.parse(rawText);
                parsed = Array.isArray(json) ? json : (json.subjects || json.courses || json.data || []);
            } catch {
                const match = rawText.match(/\[[\s\S]*\]/);
                if (match) parsed = JSON.parse(match[0]);
                else throw new Error('Could not parse AI response.');
            }

            const clamp = (v: any, max: number): number | '' => {
                const n = parseFloat(v);
                if (isNaN(n) || v === null || v === undefined) return '';
                return Math.min(max, Math.max(0, n));
            };

            const subjects: MedSubject[] = parsed
                .filter((item: any) => item.name)
                .map((item: any) => ({
                    id: generateId(),
                    name: String(item.name).trim(),
                    ca: clamp(item.ca, 30),
                    exam: clamp(item.exam, 70),
                }));

            if (subjects.length === 0) {
                throw new Error("No subjects found. Make sure you're uploading a medical result sheet.");
            }

            setExtracted(subjects);
            setStep('review');

        } catch (err: any) {
            let msg = err.message || 'Failed to analyze document.';
            if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
                msg = 'Connection error. The image may be too large or your internet is unstable.';
            }
            setError(msg);
            setStep('upload');
        }
    };

    // ── Subject Management ────────────────────────────────────────────────────

    const updateSubject = (id: string, field: keyof MedSubject, value: string | number | '') => {
        setExtracted(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const removeSubject = (id: string) => setExtracted(prev => prev.filter(s => s.id !== id));

    const addEmptyRow = () =>
        setExtracted(prev => [...prev, { id: generateId(), name: '', ca: '', exam: '' }]);

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    const reset = () => {
        stopCamera();
        setStep('upload');
        setImagePreview(null);
        setExtracted([]);
        setError(null);
    };

    const handleClose = () => { reset(); onClose(); };

    const handleImport = () => {
        const valid = extracted.filter(s => s.name.trim() !== '');
        if (valid.length === 0) { setError('No subjects to import.'); return; }
        onImport(valid);
        handleClose();
    };

    useEffect(() => { if (!isOpen) reset(); }, [isOpen]);
    useEffect(() => () => stopCamera(), []);
    useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraActive]);

    if (!isOpen) return null;

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={handleClose} />

            <div className="bg-white dark:bg-[#1a1a24] border border-gray-200 dark:border-gray-800 w-full sm:rounded-2xl sm:max-w-lg sm:mx-4 rounded-t-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[92vh] sm:max-h-[85vh] transition-colors">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111118]">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                            {step === 'review' ? 'Review Subjects' : 'Scan Result Sheet'}
                        </h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{activeYear.examName}</p>
                    </div>
                    <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">

                    {/* Error Banner */}
                    {error && (
                        <div className="mx-5 mt-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Upload */}
                    {step === 'upload' && !isCameraActive && (
                        <div className="px-5 py-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Upload your medical result sheet. AI will read each subject's CA and exam scores.
                            </p>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all cursor-pointer flex flex-col items-center text-center"
                            >
                                <div className="size-12 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center mb-3">
                                    <Upload size={22} />
                                </div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tap to upload result sheet</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, or WebP</p>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                            <button
                                onClick={startCamera}
                                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <Camera size={16} />
                                Use Camera
                            </button>

                            {/* Scoring reference */}
                            <div className="mt-4 p-3 bg-sky-50/60 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/40 rounded-lg text-xs text-sky-700 dark:text-sky-400">
                                Looking for: <strong>CA /30</strong> + <strong>Exam /70</strong>. Pass at 50/100.
                            </div>
                        </div>
                    )}

                    {/* Camera */}
                    {step === 'upload' && isCameraActive && (
                        <div className="px-5 py-4">
                            <div className="relative w-full bg-black rounded-xl overflow-hidden aspect-[3/4] sm:aspect-video mb-3">
                                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                                <canvas ref={canvasRef} className="hidden" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={stopCamera} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                                <button onClick={capturePhoto} className="flex-1 py-2.5 text-sm font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                    <Camera size={16} />Capture
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Scanning */}
                    {step === 'scanning' && (
                        <div className="flex flex-col items-center justify-center py-14 px-5">
                            <style>{`
                                @keyframes med-spin { 100% { transform: rotate(360deg); } }
                                @keyframes med-dash { 0%{stroke-dasharray:1,150;stroke-dashoffset:0} 50%{stroke-dasharray:90,150;stroke-dashoffset:-35} 100%{stroke-dasharray:90,150;stroke-dashoffset:-124} }
                                @keyframes med-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
                            `}</style>
                            <div className="mb-8">
                                <svg width="56" height="56" viewBox="0 0 50 50" style={{ animation: 'med-spin 2s linear infinite' }}>
                                    <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" className="stroke-gray-200 dark:stroke-gray-700" />
                                    <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-gray-800 dark:stroke-white" style={{ animation: 'med-dash 1.5s ease-in-out infinite' }} />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Reading result sheet</h3>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Extracting CA and exam scores…</p>
                            <div className="flex items-center gap-1.5">
                                {[0, 0.2, 0.4].map((d, i) => (
                                    <div key={i} className="size-1.5 rounded-full bg-gray-400 dark:bg-gray-500" style={{ animation: `med-pulse 1.4s ease-in-out ${d}s infinite` }} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Review */}
                    {step === 'review' && (
                        <div className="px-5 py-4">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="size-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <Check size={14} />
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {extracted.length} subject{extracted.length !== 1 ? 's' : ''} found — edit before importing
                                </span>
                            </div>

                            <div className="mb-4 max-h-[45vh] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase text-left py-2">Subject</th>
                                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase text-center py-2 w-16">CA /30</th>
                                            <th className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase text-center py-2 w-16">Exam /70</th>
                                            <th className="py-2 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {extracted.map((s) => (
                                            <tr key={s.id} className="border-b border-gray-100 dark:border-gray-700/50 group hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                                <td className="py-2 pr-2">
                                                    <input
                                                        type="text"
                                                        value={s.name}
                                                        onChange={e => updateSubject(s.id, 'name', e.target.value)}
                                                        onFocus={e => e.target.select()}
                                                        placeholder="Subject name"
                                                        className="w-full text-xs font-medium text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                                    />
                                                </td>
                                                <td className="py-2 w-16">
                                                    <input
                                                        type="number" min={0} max={30} step={0.5}
                                                        value={s.ca === '' ? '' : s.ca}
                                                        onChange={e => {
                                                            const v = e.target.value === '' ? '' : Math.min(30, Math.max(0, parseFloat(e.target.value)));
                                                            updateSubject(s.id, 'ca', v);
                                                        }}
                                                        placeholder="—"
                                                        className="w-14 text-xs text-center font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded py-1 outline-none focus:ring-1 focus:ring-gray-400/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </td>
                                                <td className="py-2 w-16">
                                                    <input
                                                        type="number" min={0} max={70} step={0.5}
                                                        value={s.exam === '' ? '' : s.exam}
                                                        onChange={e => {
                                                            const v = e.target.value === '' ? '' : Math.min(70, Math.max(0, parseFloat(e.target.value)));
                                                            updateSubject(s.id, 'exam', v);
                                                        }}
                                                        placeholder="—"
                                                        className="w-14 text-xs text-center font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded py-1 outline-none focus:ring-1 focus:ring-gray-400/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </td>
                                                <td className="py-2">
                                                    <button onClick={() => removeSubject(s.id)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {extracted.length === 0 && (
                                    <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">No subjects yet. Add one below.</div>
                                )}
                            </div>

                            <button
                                onClick={addEmptyRow}
                                className="w-full py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5 mb-4"
                            >
                                <Plus size={14} />Add Subject
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'review' && (
                    <div className="px-5 py-4 border-t border-gray-100/80 dark:border-gray-700/50 flex gap-2 bg-white/80 dark:bg-[#1a1a24]/80 backdrop-blur-md rounded-b-2xl">
                        <button onClick={reset} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            Scan Again
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={extracted.length === 0}
                            className="flex-1 py-2.5 text-sm font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Import {extracted.length > 0 ? `(${extracted.length})` : ''}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MedScannerModal;

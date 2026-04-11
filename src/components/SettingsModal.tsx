import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, RefreshCw, ChevronDown } from 'lucide-react';
import { GradingConfig } from '../types';
import { GRADING_PRESETS, DEFAULT_GRADING_CONFIG } from '../constants';

const GRADE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    viewMode: 'table' | 'card';
    onViewModeChange: (mode: 'table' | 'card') => void;
    showGradient: boolean;
    onShowGradientChange: (show: boolean) => void;
    gradientColors: string[];
    onGradientColorsChange: (colors: string[]) => void;
    gradingConfig: GradingConfig;
    onGradingConfigChange: (config: GradingConfig) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen, onClose,
    viewMode, onViewModeChange,
    showGradient, onShowGradientChange,
    gradientColors, onGradientColorsChange,
    gradingConfig, onGradingConfigChange,
}) => {
    const [isDark, setIsDark] = useState(() => {
        try { return document.documentElement.classList.contains('dark'); } catch { return false; }
    });

    const [suppressedCount, setSuppressedCount] = useState(0);

    useEffect(() => { countSuppressed(); }, [isOpen]);

    const countSuppressed = () => {
        let count = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('confirm_pref_')) count++;
            }
        } catch { }
        setSuppressedCount(count);
    };

    const toggleDarkMode = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const resetConfirmations = () => {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('confirm_pref_')) keysToRemove.push(key);
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            setSuppressedCount(0);
        } catch { }
    };

    // Gradient color state (local to avoid WebGL re-renders on every drag)
    const [localColors, setLocalColors] = useState<string[]>(gradientColors);
    useEffect(() => { setLocalColors(gradientColors); }, [gradientColors]);

    const handleColorDrag = (index: number, newColor: string) => {
        const next = [...localColors]; next[index] = newColor; setLocalColors(next);
    };
    const handleColorDrop = (index: number, newColor: string) => {
        const next = [...gradientColors]; next[index] = newColor; onGradientColorsChange(next);
    };
    const handleAddColor = () => {
        if (gradientColors.length >= 6) return;
        onGradientColorsChange([...gradientColors, '#000000']);
    };
    const handleRemoveColor = (index: number) => {
        if (gradientColors.length <= 1) return;
        const next = [...gradientColors]; next.splice(index, 1); onGradientColorsChange(next);
    };
    const generateRandomGradient = () => {
        onGradientColorsChange(gradientColors.map(() =>
            '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
        ));
    };

    // Grading config helpers
    const applyPreset = (preset: GradingConfig) => {
        onGradingConfigChange({ ...preset });
    };


    const updateScoreRange = (letter: typeof GRADE_LETTERS[number], bound: 'min' | 'max', raw: string) => {
        const val = parseInt(raw);
        if (isNaN(val)) return;
        onGradingConfigChange({
            ...gradingConfig,
            scoreRanges: {
                ...gradingConfig.scoreRanges,
                [letter]: { ...gradingConfig.scoreRanges[letter], [bound]: val },
            },
            presetName: 'Custom',
        });
    };

    const resetGrading = () => onGradingConfigChange({ ...DEFAULT_GRADING_CONFIG });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="bg-white dark:bg-[#1a1a24] border border-gray-200 dark:border-gray-800 w-full sm:rounded-2xl sm:max-w-sm sm:mx-4 rounded-t-2xl shadow-2xl relative z-10 flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111118]">
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Settings</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

                    {/* ── Appearance ── */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Appearance</h3>
                        <div className="space-y-2">
                            <button
                                onClick={toggleDarkMode}
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="text-left">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 block">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">Toggle light/dark theme</span>
                                </div>
                                <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${isDark ? 'bg-gray-900 dark:bg-gray-200' : 'bg-gray-300'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-white dark:bg-gray-900 shadow-sm transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>
                            <button
                                onClick={() => onShowGradientChange(!showGradient)}
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="text-left">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 block">Background Effect</span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">Colorful gradient glow behind content</span>
                                </div>
                                <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${showGradient ? 'bg-gray-900 dark:bg-gray-200' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-white dark:bg-gray-900 shadow-sm transition-transform ${showGradient ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>
                        </div>
                    </section>

                    {/* ── Gradient Colors ── */}
                    {showGradient && (
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Gradient Colors</h3>
                                <button onClick={generateRandomGradient} className="text-[10px] font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors bg-gray-100 dark:bg-gray-700/80 px-2 py-1 rounded-md">
                                    <RefreshCw size={10} /> Randomize
                                </button>
                            </div>
                            <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 space-y-3">
                                <div className="space-y-2">
                                    {localColors.map((color, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <input type="color" value={color}
                                                onChange={(e) => handleColorDrag(index, e.target.value)}
                                                onBlur={(e) => handleColorDrop(index, e.target.value)}
                                                className="size-8 cursor-pointer shrink-0 rounded border-0 p-0 bg-transparent"
                                            />
                                            <input type="text" value={color.toUpperCase()}
                                                onChange={(e) => handleColorDrop(index, e.target.value)}
                                                className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md py-1.5 px-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase outline-none focus:ring-1 focus:ring-gray-400 transition-shadow"
                                                placeholder="#FFFFFF" maxLength={7}
                                            />
                                            <button onClick={() => handleRemoveColor(index)} disabled={gradientColors.length <= 1}
                                                className={`p-1.5 rounded-md transition-colors shrink-0 ${gradientColors.length <= 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {gradientColors.length < 6 && (
                                    <button onClick={handleAddColor} className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5">
                                        <Plus size={12} /> Add Color
                                    </button>
                                )}
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center uppercase tracking-wide px-1">Tip: Add multiple colors for a richer gradient effect.</p>
                            </div>
                        </section>
                    )}

                    {/* ── Grading System ── */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Grading System</h3>
                            <button onClick={resetGrading} className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 hover:text-gray-800 dark:hover:text-gray-100 transition-colors bg-gray-100 dark:bg-gray-700/80 px-2 py-1 rounded-md">
                                <RefreshCw size={10} /> Reset
                            </button>
                        </div>

                        {/* Preset Picker */}
                        <div className="relative mb-2">
                            <select
                                value={gradingConfig.presetName}
                                onChange={(e) => {
                                    if (e.target.value === 'Custom') return;
                                    const preset = GRADING_PRESETS.find(p => p.presetName === e.target.value);
                                    if (preset) applyPreset(preset);
                                }}
                                aria-label="Select grading system preset"
                                className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg py-2 pl-3 pr-8 text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent transition-all"
                            >
                                {GRADING_PRESETS.map(p => (
                                    <option key={p.presetName} value={p.presetName}>{p.presetName}</option>
                                ))}
                                {gradingConfig.presetName === 'Custom' && (
                                    <option value="Custom">Custom (Edited)</option>
                                )}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3 leading-relaxed">
                            Not matching your school? Edit the score ranges below to fit your grading system.
                        </p>

                        <div className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="grid grid-cols-[2rem_1fr_1fr] bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700 px-3 py-1.5">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Grade</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center">Min Score</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center">Max Score</span>
                            </div>
                            {GRADE_LETTERS.map((letter) => (
                                <div key={letter} className="grid grid-cols-[2rem_1fr_1fr] items-center px-3 py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                                    <span className="text-sm font-black text-gray-700 dark:text-gray-300">{letter}</span>
                                    <div className="flex justify-center">
                                        <input
                                            type="number" min={0} max={100}
                                            value={gradingConfig.scoreRanges[letter].min}
                                            onChange={(e) => updateScoreRange(letter, 'min', e.target.value)}
                                            aria-label={`Minimum score for grade ${letter}`}
                                            className="w-14 text-center text-xs font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md py-1 outline-none focus:ring-1 focus:ring-gray-400/40"
                                        />
                                    </div>
                                    <div className="flex justify-center">
                                        <input
                                            type="number" min={0} max={100}
                                            value={gradingConfig.scoreRanges[letter].max}
                                            onChange={(e) => updateScoreRange(letter, 'max', e.target.value)}
                                            aria-label={`Maximum score for grade ${letter}`}
                                            className="w-14 text-center text-xs font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md py-1 outline-none focus:ring-1 focus:ring-gray-400/40"
                                        />
                                    </div>
                                </div>
                            ))}
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center py-2 px-3">
                                Used by AI scanner to convert numerical scores to grades
                            </p>
                        </div>
                    </section>

                    {/* ── View Layout ── */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">View Layout</h3>
                        <div className="p-1 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex">
                            <button onClick={() => onViewModeChange('table')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                Table
                            </button>
                            <button onClick={() => onViewModeChange('card')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'card' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                Cards
                            </button>
                        </div>
                    </section>

                    {/* ── Confirmations ── */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Confirmations</h3>
                        <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 block">Reset Dialogs</span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                        {suppressedCount > 0 ? `${suppressedCount} dialog${suppressedCount > 1 ? 's' : ''} suppressed` : 'No dialogs suppressed'}
                                    </span>
                                </div>
                                <button
                                    onClick={resetConfirmations}
                                    disabled={suppressedCount === 0}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${suppressedCount > 0 ? 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

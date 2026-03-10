import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    viewMode: 'table' | 'card';
    onViewModeChange: (mode: 'table' | 'card') => void;
    showGradient: boolean;
    onShowGradientChange: (show: boolean) => void;
    gradientColors: string[];
    onGradientColorsChange: (colors: string[]) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, viewMode, onViewModeChange, showGradient, onShowGradientChange, gradientColors, onGradientColorsChange }) => {
    const [isDark, setIsDark] = useState(() => {
        try {
            return localStorage.getItem('theme') === 'dark';
        } catch { return false; }
    });

    const [suppressedCount, setSuppressedCount] = useState(0);

    useEffect(() => {
        countSuppressed();
    }, [isOpen]);

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

    // We maintain a local state for the color inputs while they are being dragged,
    // to prevent the entire Grainient WebGL canvas from re-rendering uncomfortably on every tiny mouse movement.
    const [localColors, setLocalColors] = useState<string[]>(gradientColors);

    useEffect(() => {
        setLocalColors(gradientColors);
    }, [gradientColors]);

    const handleColorInteractionDrag = (index: number, newColor: string) => {
        const newLocal = [...localColors];
        newLocal[index] = newColor;
        setLocalColors(newLocal);
    };

    const handleColorInteractionDrop = (index: number, newColor: string) => {
        const newColors = [...gradientColors];
        newColors[index] = newColor;
        onGradientColorsChange(newColors);
    };

    const handleAddColor = () => {
        if (gradientColors.length >= 6) return;
        onGradientColorsChange([...gradientColors, '#000000']);
    };

    const handleRemoveColor = (index: number) => {
        if (gradientColors.length <= 1) return;
        const newColors = [...gradientColors];
        newColors.splice(index, 1);
        onGradientColorsChange(newColors);
    };

    const generateRandomGradient = () => {
        const palettes = [
            ['#FF9FFC', '#5227FF', '#B19EEF'], // the OG
            ['#FF5F6D', '#FFC371'], // peach sunset
            ['#00C9FF', '#92FE9D'], // minty fresh
            ['#8E2DE2', '#4A00E0', '#00C9FF'], // deep space
            ['#f12711', '#f5af19'], // fiery inferno
            ['#11998e', '#38ef7d'], // emerald dreams
            ['#FDFC47', '#24FE41'], // neon life
            ['#00c6ff', '#0072ff'], // oceanic
            ['#a18cd1', '#fbc2eb', '#e1eec3'], // soft dawn
            ['#ff9a9e', '#fecfef'], // cotton candy
            ['#ff77a8', '#f8bbd0', '#e1bee7', '#ce93d8'], // magical girl
            ['#000000', '#434343'], // dark slate
            ['#1a2a6c', '#b21f1f', '#fdbb2d'], // deep retro
            ['#4facfe', '#00f2fe', '#4facfe'], // sky loop
            ['#ff0844', '#ffb199'], // vibrant heart
        ];

        // Pick a random palette. If it's the exact same length as current, maybe randomly pick one of correct size, 
        // but it's more fun to just adopt the palette's size organically!
        const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];
        onGradientColorsChange([...randomPalette]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="bg-white/90 dark:bg-[#1a1a24]/90 backdrop-blur-xl w-full sm:rounded-2xl sm:max-w-sm sm:mx-4 rounded-t-2xl shadow-2xl relative z-10 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Settings</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

                    {/* Theme */}
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

                    {/* Gradient Customization */}
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
                                            <div className="relative size-8 rounded-md overflow-hidden shrink-0 border border-gray-200 dark:border-gray-600 shadow-sm cursor-pointer group hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                                                <input
                                                    type="color"
                                                    value={color}
                                                    onChange={(e) => handleColorInteractionDrag(index, e.target.value)}
                                                    onBlur={(e) => handleColorInteractionDrop(index, e.target.value)} // Commit on release/blur
                                                    className="absolute inset-[-10px] size-[50px] cursor-pointer"
                                                    title="Click and drag to choose color"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={color.toUpperCase()}
                                                onChange={(e) => handleColorInteractionDrop(index, e.target.value)}
                                                className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md py-1.5 px-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-shadow"
                                                placeholder="#FFFFFF"
                                                maxLength={7}
                                            />
                                            <button
                                                onClick={() => handleRemoveColor(index)}
                                                disabled={gradientColors.length <= 1}
                                                className={`p-1.5 rounded-md transition-colors shrink-0 ${gradientColors.length <= 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {gradientColors.length < 6 && (
                                    <button
                                        onClick={handleAddColor}
                                        className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Plus size={12} /> Add Color
                                    </button>
                                )}
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center uppercase tracking-wide px-1">Tip: Add multiple colors for a richer gradient effect.</p>
                            </div>
                        </section>
                    )}

                    {/* View Layout */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">View Layout</h3>
                        <div className="p-1 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex">
                            <button
                                onClick={() => onViewModeChange('table')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'table'
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                Table
                            </button>
                            <button
                                onClick={() => onViewModeChange('card')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'card'
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                Cards
                            </button>
                        </div>
                    </section>

                    {/* Confirmations */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Confirmations</h3>
                        <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 block">Reset Dialogs</span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                        {suppressedCount > 0
                                            ? `${suppressedCount} dialog${suppressedCount > 1 ? 's' : ''} suppressed`
                                            : 'No dialogs suppressed'}
                                    </span>
                                </div>
                                <button
                                    onClick={resetConfirmations}
                                    disabled={suppressedCount === 0}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${suppressedCount > 0
                                        ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                        }`}
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

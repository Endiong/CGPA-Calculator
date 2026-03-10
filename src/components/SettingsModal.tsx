import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    viewMode: 'table' | 'card';
    onViewModeChange: (mode: 'table' | 'card') => void;
    showGradient: boolean;
    onShowGradientChange: (show: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, viewMode, onViewModeChange, showGradient, onShowGradientChange }) => {
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

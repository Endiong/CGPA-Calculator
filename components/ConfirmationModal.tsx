import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    preferenceKey?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDestructive = false,
    preferenceKey,
}) => {
    const [dontAskAgain, setDontAskAgain] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (preferenceKey && dontAskAgain) {
            try {
                localStorage.setItem(`confirm_pref_${preferenceKey}`, 'true');
            } catch (e) {
                console.error('Failed to save preference', e);
            }
        }
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} />
            <div
                className="bg-white dark:bg-[#1a1a24] rounded-xl shadow-2xl max-w-md w-full overflow-hidden relative z-10 transition-colors"
                role="dialog"
                aria-modal="true"
            >
                <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-1"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">
                        {message}
                    </p>

                    {preferenceKey && (
                        <div className="flex items-center gap-2 mb-5">
                            <input
                                type="checkbox"
                                id="dontAskAgain"
                                checked={dontAskAgain}
                                onChange={(e) => setDontAskAgain(e.target.checked)}
                                className="rounded border-gray-300 dark:border-gray-600 text-gray-600 focus:ring-gray-500 h-3.5 w-3.5"
                            />
                            <label htmlFor="dontAskAgain" className="text-xs text-gray-500 dark:text-gray-400 select-none cursor-pointer">
                                Don't ask me again
                            </label>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`px-3.5 py-2 text-xs font-semibold text-white rounded-lg transition-colors ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-primary hover:bg-primary-dark'
                                }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;

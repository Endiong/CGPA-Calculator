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
    preferenceKey?: string; // If provided, shows "Don't ask again" checkbox
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden scale-100 transition-transform duration-200"
                role="dialog"
                aria-modal="true"
            >
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center size-10 rounded-full ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <p className="text-gray-600 mb-6 leading-relaxed">
                        {message}
                    </p>

                    {preferenceKey && (
                        <div className="flex items-center gap-2 mb-6">
                            <input
                                type="checkbox"
                                id="dontAskAgain"
                                checked={dontAskAgain}
                                onChange={(e) => setDontAskAgain(e.target.checked)}
                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                            />
                            <label htmlFor="dontAskAgain" className="text-sm text-gray-600 select-none cursor-pointer">
                                Don't ask me again for this action
                            </label>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${isDestructive
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-primary hover:bg-primary/90'
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

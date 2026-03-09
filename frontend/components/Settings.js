import {useState} from 'react';
import {
    GearIcon,
    KeyIcon,
    CheckCircleIcon,
    XCircleIcon,
    SpinnerIcon,
    ArrowSquareOutIcon,
    CoinsIcon,
} from '@phosphor-icons/react';
import {verifyApiKey} from '../api';

export function SettingsPanel({apiKey, onClose}) {
    const [verifying, setVerifying] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleVerify = async () => {
        if (!apiKey) {
            setError('No API key configured. Set it in the properties panel.');
            return;
        }
        setVerifying(true);
        setError(null);
        setResult(null);
        try {
            const data = await verifyApiKey(apiKey);
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-gray700 rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-gray100 dark:border-gray-gray600">
                    <div className="flex items-center gap-2">
                        <GearIcon size={18} className="text-gray-gray500 dark:text-gray-gray300" />
                        <h2 className="text-lg font-semibold text-gray-gray700 dark:text-gray-gray200">
                            Settings
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-gray400 hover:text-gray-gray600 dark:hover:text-gray-gray200 transition-colors"
                    >
                        <XCircleIcon size={22} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                    {/* API Key Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-gray600 dark:text-gray-gray300 mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <KeyIcon size={14} />
                                API Key
                            </div>
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 px-3 py-2 bg-gray-gray50 dark:bg-gray-gray800 border border-gray-gray200 dark:border-gray-gray600 rounded-md text-sm text-gray-gray500 dark:text-gray-gray400 font-mono truncate">
                                {apiKey ? `${apiKey.slice(0, 8)}${'•'.repeat(20)}` : 'Not configured'}
                            </div>
                            <button
                                onClick={handleVerify}
                                disabled={verifying || !apiKey}
                                className="px-3 py-2 bg-blue-blue hover:bg-blue-blueDark1 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
                            >
                                {verifying ? (
                                    <SpinnerIcon size={14} className="animate-spin" />
                                ) : (
                                    <CheckCircleIcon size={14} />
                                )}
                                Verify
                            </button>
                        </div>
                        <p className="mt-1.5 text-xs text-gray-gray400 dark:text-gray-gray400">
                            Configure your API key in the{' '}
                            <span className="font-medium text-blue-blue">properties panel</span> of
                            this extension.
                        </p>
                    </div>

                    {/* Verification Result */}
                    {result && (
                        <div className="flex items-start gap-2 p-3 bg-green-greenLight3 dark:bg-green-greenDark1/20 border border-green-greenLight1 dark:border-green-greenDark1 rounded-md">
                            <CheckCircleIcon
                                size={18}
                                weight="fill"
                                className="text-green-green mt-0.5 shrink-0"
                            />
                            <div>
                                <p className="text-sm font-medium text-green-greenDark1 dark:text-green-greenLight1">
                                    API key is valid
                                </p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-green-greenDark1/80 dark:text-green-greenLight1/80">
                                    <CoinsIcon size={12} />
                                    <span>
                                        {result.credits} credits remaining ({result.credits_used}{' '}
                                        used)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-redLight3 dark:bg-red-redDark1/20 border border-red-redLight1 dark:border-red-redDark1 rounded-md">
                            <XCircleIcon
                                size={18}
                                weight="fill"
                                className="text-red-red mt-0.5 shrink-0"
                            />
                            <p className="text-sm text-red-redDark1 dark:text-red-redLight1">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Get API Key Link */}
                    <a
                        href="https://uploadtourl.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2.5 bg-gray-gray50 dark:bg-gray-gray800 border border-gray-gray200 dark:border-gray-gray600 rounded-md hover:bg-gray-gray75 dark:hover:bg-gray-gray700 transition-colors group"
                    >
                        <ArrowSquareOutIcon
                            size={16}
                            className="text-blue-blue group-hover:text-blue-blueDark1"
                        />
                        <span className="text-sm text-gray-gray600 dark:text-gray-gray300">
                            Get your API key from{' '}
                            <span className="text-blue-blue font-medium">
                                uploadtourl.com/dashboard
                            </span>
                        </span>
                    </a>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-gray100 dark:border-gray-gray600 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-gray100 dark:bg-gray-gray600 hover:bg-gray-gray200 dark:hover:bg-gray-gray500 text-sm font-medium text-gray-gray600 dark:text-gray-gray200 rounded-md transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ApiKeySetupPrompt() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-blueLight3 dark:bg-blue-blueDark1/20 flex items-center justify-center mb-4">
                <KeyIcon size={28} className="text-blue-blue" />
            </div>
            <h2 className="text-xl font-semibold text-gray-gray700 dark:text-gray-gray200 mb-2">
                API Key Required
            </h2>
            <p className="text-sm text-gray-gray500 dark:text-gray-gray400 max-w-sm mb-4">
                To use Upload to URL, configure your API key in the{' '}
                <span className="font-medium text-blue-blue">properties panel</span> of this
                extension.
            </p>
            <a
                href="https://uploadtourl.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-blue hover:bg-blue-blueDark1 text-white text-sm font-medium rounded-md transition-colors"
            >
                <ArrowSquareOutIcon size={16} />
                Get your API key
            </a>
        </div>
    );
}

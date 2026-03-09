import {useState} from 'react';
import {initializeBlock, useGlobalConfig} from '@airtable/blocks/interface/ui';
import {
    CloudArrowUpIcon,
    StackIcon,
    GearIcon,
} from '@phosphor-icons/react';
import './style.css';
import UploadTab from './components/UploadTab';
import BulkUploadTab from './components/BulkUploadTab';
import {SettingsPanel, ApiKeySetupPrompt} from './components/Settings';

const TABS = [
    {id: 'upload', label: 'Upload & Attach', icon: CloudArrowUpIcon},
    {id: 'bulk', label: 'Bulk Upload', icon: StackIcon},
];

function UploadToUrlApp() {
    const globalConfig = useGlobalConfig();
    const [activeTab, setActiveTab] = useState('upload');
    const [showSettings, setShowSettings] = useState(false);

    const apiKey = (globalConfig.get('apiKey') || '');

    // Show setup prompt if no API key
    if (!apiKey) {
        return (
            <div className="min-h-screen bg-gray-gray50 dark:bg-gray-gray800">
                <ApiKeySetupPrompt globalConfig={globalConfig} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-gray50 dark:bg-gray-gray800">
            <div className="max-w-xl mx-auto px-4 py-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-lg font-semibold text-gray-gray700 dark:text-gray-gray200">
                        Upload to URL
                    </h1>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-1.5 text-gray-gray400 hover:text-gray-gray600 dark:hover:text-gray-gray200 hover:bg-gray-gray100 dark:hover:bg-gray-gray700 rounded-md transition-colors"
                        title="Settings"
                    >
                        <GearIcon size={18} />
                    </button>
                </div>

                {/* Tab Bar */}
                <div className="flex border-b border-gray-gray100 dark:border-gray-gray600 mb-4">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                    isActive
                                        ? 'border-blue-blue text-blue-blue'
                                        : 'border-transparent text-gray-gray400 hover:text-gray-gray600 dark:hover:text-gray-gray300'
                                }`}
                            >
                                <Icon size={15} weight={isActive ? 'fill' : 'regular'} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="pb-6">
                    {activeTab === 'upload' && <UploadTab apiKey={apiKey} />}
                    {activeTab === 'bulk' && <BulkUploadTab apiKey={apiKey} />}
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <SettingsPanel apiKey={apiKey} globalConfig={globalConfig} onClose={() => setShowSettings(false)} />
            )}
        </div>
    );
}

initializeBlock({interface: () => <UploadToUrlApp />});

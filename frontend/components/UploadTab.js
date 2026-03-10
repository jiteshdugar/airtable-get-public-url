import {useState, useRef, useCallback} from 'react';
import {useBase, useRecords} from '@airtable/blocks/interface/ui';
import {FieldType} from '@airtable/blocks/interface/models';
import {
    CloudArrowUpIcon,
    FileIcon,
    CopyIcon,
    CheckIcon,
    TrashIcon,
    SpinnerIcon,
    CalendarIcon,
    CaretDownIcon,
    CheckCircleIcon,
    TableIcon,
} from '@phosphor-icons/react';
import {uploadFile} from '../api';

function RecordOptions({table}) {
    const records = useRecords(table);
    if (!records) return null;
    return records.map((r) => (
        <option key={r.id} value={r.id}>
            {r.name || r.id}
        </option>
    ));
}

const EXPIRY_OPTIONS = [
    {value: 'never', label: 'No expiry'},
    {value: '1', label: '1 day'},
    {value: '7', label: '7 days'},
    {value: '30', label: '30 days'},
];

export default function UploadTab({apiKey}) {
    const base = useBase();
    const [selectedTableId, setSelectedTableId] = useState('');
    const [selectedRecordId, setSelectedRecordId] = useState('');
    const [file, setFile] = useState(null);
    const [expiry, setExpiry] = useState('never');
    const [selectedFieldId, setSelectedFieldId] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [written, setWritten] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const tables = base?.tables ?? [];
    const table = selectedTableId ? base?.getTableByIdIfExists(selectedTableId) : null;

    // Get URL/text fields for destination
    const targetFields = table
        ? table.fields.filter(
              (f) =>
                  f.type === FieldType.URL ||
                  f.type === FieldType.SINGLE_LINE_TEXT ||
                  f.type === FieldType.MULTILINE_TEXT,
          )
        : [];

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setFile(droppedFile);
            setResult(null);
            setError(null);
            setWritten(false);
        }
    }, []);

    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setResult(null);
            setError(null);
            setWritten(false);
        }
    };

    const handleUpload = async () => {
        if (!file || !apiKey) return;
        setUploading(true);
        setError(null);
        setResult(null);
        setWritten(false);
        try {
            const data = await uploadFile(apiKey, file, expiry);
            setResult(data);

            // Auto-write to record if field is selected
            if (selectedRecordId && selectedFieldId) {
                await writeToRecord(data.url || data.public_url);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const writeToRecord = async (url) => {
        if (!selectedRecordId || !selectedFieldId || !url) return;

        const field = table.getFieldIfExists(selectedFieldId);
        if (!field) return;

        try {
            const value = url;

            const hasPermission = table.hasPermissionToUpdateRecords([
                {id: selectedRecordId, fields: {[field.id]: value}},
            ]);

            if (!hasPermission) {
                setError('You do not have permission to update this record.');
                return;
            }

            await table.updateRecordAsync(selectedRecordId, {[field.id]: value});
            setWritten(true);
        } catch (err) {
            setError(`Failed to write to record: ${err.message}`);
        }
    };

    const handleCopy = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const publicUrl = result?.url || result?.public_url;

    return (
        <div className="space-y-4">
            {/* Table Selector */}
            <div>
                <label className="block text-sm font-medium text-gray-gray600 dark:text-gray-gray300 mb-1.5">
                    <div className="flex items-center gap-1.5">
                        <TableIcon size={13} />
                        Table
                    </div>
                </label>
                <div className="relative">
                    <select
                        value={selectedTableId}
                        onChange={(e) => {
                            setSelectedTableId(e.target.value);
                            setSelectedRecordId('');
                            setSelectedFieldId('');
                            setWritten(false);
                        }}
                        className="w-full appearance-none px-3 py-2 pr-8 bg-white dark:bg-gray-gray800 border border-gray-gray200 dark:border-gray-gray600 rounded-md text-sm text-gray-gray700 dark:text-gray-gray200 focus:outline-none focus:ring-2 focus:ring-blue-blue/30 focus:border-blue-blue"
                    >
                        <option value="">Choose a table...</option>
                        {tables.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                    <CaretDownIcon
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-gray400 pointer-events-none"
                    />
                </div>
            </div>

            {/* Record Selector */}
            {table && <div>
                <label className="block text-sm font-medium text-gray-gray600 dark:text-gray-gray300 mb-1.5">
                    Select Record
                </label>
                <div className="relative">
                    <select
                        value={selectedRecordId}
                        onChange={(e) => {
                            setSelectedRecordId(e.target.value);
                            setWritten(false);
                        }}
                        className="w-full appearance-none px-3 py-2 pr-8 bg-white dark:bg-gray-gray800 border border-gray-gray200 dark:border-gray-gray600 rounded-md text-sm text-gray-gray700 dark:text-gray-gray200 focus:outline-none focus:ring-2 focus:ring-blue-blue/30 focus:border-blue-blue"
                    >
                        <option value="">Choose a record...</option>
                        {table && <RecordOptions table={table} />}
                    </select>
                    <CaretDownIcon
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-gray400 pointer-events-none"
                    />
                </div>
            </div>}

            {/* File Drop Zone */}
            <div>
                <label className="block text-sm font-medium text-gray-gray600 dark:text-gray-gray300 mb-1.5">
                    Upload File
                </label>
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                        ${
                            dragOver
                                ? 'border-blue-blue bg-blue-blueLight3 dark:bg-blue-blueDark1/10'
                                : file
                                  ? 'border-green-greenLight1 bg-green-greenLight3 dark:bg-green-greenDark1/10 dark:border-green-greenDark1'
                                  : 'border-gray-gray200 dark:border-gray-gray600 hover:border-blue-blueLight1 hover:bg-gray-gray25 dark:hover:bg-gray-gray800'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    {file ? (
                        <div className="flex items-center justify-center gap-3">
                            <FileIcon
                                size={24}
                                weight="duotone"
                                className="text-green-green shrink-0"
                            />
                            <div className="text-left min-w-0">
                                <p className="text-sm font-medium text-gray-gray700 dark:text-gray-gray200 truncate">
                                    {file.name}
                                </p>
                                <p className="text-xs text-gray-gray400">
                                    {formatFileSize(file.size)}
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                    setResult(null);
                                    setWritten(false);
                                }}
                                className="ml-2 p-1 text-gray-gray400 hover:text-red-red transition-colors"
                            >
                                <TrashIcon size={16} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <CloudArrowUpIcon
                                size={36}
                                weight="duotone"
                                className={`mx-auto mb-2 ${dragOver ? 'text-blue-blue' : 'text-gray-gray300 dark:text-gray-gray500'}`}
                            />
                            <p className="text-sm text-gray-gray500 dark:text-gray-gray400">
                                <span className="font-medium text-blue-blue">Click to browse</span>{' '}
                                or drag and drop
                            </p>
                            <p className="text-xs text-gray-gray400 dark:text-gray-gray500 mt-1">
                                Any file type supported
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Expiry Picker */}
            <div>
                <label className="block text-sm font-medium text-gray-gray600 dark:text-gray-gray300 mb-1.5">
                    <div className="flex items-center gap-1.5">
                        <CalendarIcon size={13} />
                        Link Expiry
                    </div>
                </label>
                <div className="relative">
                    <select
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className="w-full appearance-none px-3 py-2 pr-8 bg-white dark:bg-gray-gray800 border border-gray-gray200 dark:border-gray-gray600 rounded-md text-sm text-gray-gray700 dark:text-gray-gray200 focus:outline-none focus:ring-2 focus:ring-blue-blue/30 focus:border-blue-blue"
                    >
                        {EXPIRY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <CaretDownIcon
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-gray400 pointer-events-none"
                    />
                </div>
            </div>

            {/* Destination Field */}
            {table && (
                <div>
                    <label className="block text-sm font-medium text-gray-gray600 dark:text-gray-gray300 mb-1.5">
                        Destination Field
                        <span className="text-xs font-normal text-gray-gray400 ml-1">(optional)</span>
                    </label>
                    <div className="relative">
                        <select
                            value={selectedFieldId}
                            onChange={(e) => setSelectedFieldId(e.target.value)}
                            className="w-full appearance-none px-3 py-2 pr-8 bg-white dark:bg-gray-gray800 border border-gray-gray200 dark:border-gray-gray600 rounded-md text-sm text-gray-gray700 dark:text-gray-gray200 focus:outline-none focus:ring-2 focus:ring-blue-blue/30 focus:border-blue-blue"
                        >
                            <option value="">Select a URL / text field...</option>
                            {targetFields.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </select>
                        <CaretDownIcon
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-gray400 pointer-events-none"
                        />
                    </div>
                    {targetFields.length === 0 && (
                        <p className="text-xs text-yellow-yellowDark1 dark:text-yellow-yellow mt-1">
                            No URL or text fields found in this table.
                        </p>
                    )}
                </div>
            )}

            {/* Upload Button */}
            <button
                onClick={handleUpload}
                disabled={!file || uploading || !apiKey}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-blue hover:bg-blue-blueDark1 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors text-sm"
            >
                {uploading ? (
                    <>
                        <SpinnerIcon size={16} className="animate-spin" />
                        Uploading...
                    </>
                ) : (
                    <>
                        <CloudArrowUpIcon size={16} weight="bold" />
                        Upload &amp; Get URL
                    </>
                )}
            </button>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-redLight3 dark:bg-red-redDark1/20 border border-red-redLight1 dark:border-red-redDark1 rounded-md">
                    <p className="text-sm text-red-redDark1 dark:text-red-redLight1">{error}</p>
                </div>
            )}

            {/* Result */}
            {publicUrl && (
                <div className="p-4 bg-green-greenLight3 dark:bg-green-greenDark1/10 border border-green-greenLight1 dark:border-green-greenDark1 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                        <CheckCircleIcon
                            size={18}
                            weight="fill"
                            className="text-green-green shrink-0"
                        />
                        <p className="text-sm font-medium text-green-greenDark1 dark:text-green-greenLight1">
                            Upload successful!
                        </p>
                    </div>

                    {/* URL with Copy */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 bg-white dark:bg-gray-gray800 border border-gray-gray200 dark:border-gray-gray600 rounded-md text-xs font-mono text-gray-gray600 dark:text-gray-gray300 truncate">
                            {publicUrl}
                        </div>
                        <button
                            onClick={() => handleCopy(publicUrl)}
                            className="shrink-0 p-2 bg-white dark:bg-gray-gray800 border border-gray-gray200 dark:border-gray-gray600 rounded-md hover:bg-gray-gray50 dark:hover:bg-gray-gray700 transition-colors"
                            title="Copy URL"
                        >
                            {copied ? (
                                <CheckIcon size={16} className="text-green-green" />
                            ) : (
                                <CopyIcon size={16} className="text-gray-gray500" />
                            )}
                        </button>
                    </div>

                    {/* Write confirmation */}
                    {written && (
                        <p className="text-xs text-green-greenDark1 dark:text-green-greenLight1 flex items-center gap-1">
                            <CheckCircleIcon size={12} weight="fill" />
                            URL written to record successfully
                        </p>
                    )}

                    {/* Manual write button if not auto-written */}
                    {!written && selectedRecordId && selectedFieldId && (
                        <button
                            onClick={() => writeToRecord(publicUrl)}
                            className="w-full px-3 py-2 bg-green-green hover:bg-green-greenDark1 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5"
                        >
                            <CheckCircleIcon size={14} />
                            Write to Record
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

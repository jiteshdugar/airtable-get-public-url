import {useState, useCallback} from 'react';
import {useBase, useRecords} from '@airtable/blocks/interface/ui';
import {FieldType} from '@airtable/blocks/interface/models';
import {
    LightningIcon,
    SpinnerIcon,
    CalendarIcon,
    CaretDownIcon,
    CheckCircleIcon,
    WarningIcon,
    XCircleIcon,
    ArrowRightIcon,
    TableIcon,
} from '@phosphor-icons/react';
import {uploadFromUrl} from '../api';

const EXPIRY_OPTIONS = [
    {value: 'never', label: 'No expiry'},
    {value: '1', label: '1 day'},
    {value: '7', label: '7 days'},
    {value: '30', label: '30 days'},
];

export default function BulkUploadTab({apiKey}) {
    const base = useBase();
    const [selectedTableId, setSelectedTableId] = useState('');
    const [selectedViewId, setSelectedViewId] = useState('');
    const [sourceFieldId, setSourceFieldId] = useState('');
    const [destFieldId, setDestFieldId] = useState('');
    const [expiry, setExpiry] = useState('never');
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({current: 0, total: 0, errors: []});
    const [completed, setCompleted] = useState(false);

    const tables = base?.tables ?? [];
    const selectedTable = selectedTableId ? base?.getTableByIdIfExists(selectedTableId) : null;
    const selectedView =
        selectedTable && selectedViewId
            ? selectedTable.views.find((v) => v.id === selectedViewId)
            : null;

    const records = useRecords(selectedView || selectedTable || undefined);

    // Get attachment fields for source
    const attachmentFields = selectedTable
        ? selectedTable.fields.filter((f) => f.type === FieldType.MULTIPLE_ATTACHMENTS)
        : [];

    // Get URL/text fields for destination
    const destFields = selectedTable
        ? selectedTable.fields.filter(
              (f) =>
                  f.type === FieldType.URL ||
                  f.type === FieldType.SINGLE_LINE_TEXT ||
                  f.type === FieldType.MULTILINE_TEXT,
          )
        : [];

    const handleConvertAll = useCallback(async () => {
        if (!selectedTable || !sourceFieldId || !destFieldId || !apiKey || !records) return;

        const sourceField = selectedTable.getFieldIfExists(sourceFieldId);
        const destField = selectedTable.getFieldIfExists(destFieldId);
        if (!sourceField || !destField) return;

        // Filter records that have attachments
        const recordsWithAttachments = records.filter((r) => {
            const cellValue = r.getCellValue(sourceField);
            return cellValue && Array.isArray(cellValue) && cellValue.length > 0;
        });

        if (recordsWithAttachments.length === 0) {
            setProgress({current: 0, total: 0, errors: ['No records with attachments found.']});
            return;
        }

        setProcessing(true);
        setCompleted(false);
        setProgress({current: 0, total: recordsWithAttachments.length, errors: []});

        const errors = [];

        for (let i = 0; i < recordsWithAttachments.length; i++) {
            const record = recordsWithAttachments[i];
            const attachments = record.getCellValue(sourceField);

            try {
                // Upload the first attachment
                const attachment = attachments[0];
                const result = await uploadFromUrl(
                    apiKey,
                    attachment.url,
                    attachment.filename,
                    expiry,
                );
                const publicUrl = result.url || result.public_url;

                if (publicUrl) {
                    const hasPermission = selectedTable.hasPermissionToUpdateRecords([
                        {id: record.id, fields: {[destField.id]: publicUrl}},
                    ]);

                    if (hasPermission) {
                        await selectedTable.updateRecordAsync(record.id, {
                            [destField.id]: publicUrl,
                        });
                    } else {
                        errors.push(
                            `Record "${record.name || record.id}": No permission to update`,
                        );
                    }
                }
            } catch (err) {
                errors.push(`Record "${record.name || record.id}": ${err.message}`);
            }

            setProgress({current: i + 1, total: recordsWithAttachments.length, errors: [...errors]});

            // Rate limiting: small delay between uploads
            if (i < recordsWithAttachments.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }

        setProcessing(false);
        setCompleted(true);
    }, [selectedTable, sourceFieldId, destFieldId, apiKey, records, expiry]);

    const progressPercent =
        progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

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
                            setSelectedViewId('');
                            setSourceFieldId('');
                            setDestFieldId('');
                            setCompleted(false);
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

            {/* View Selector */}
            {selectedTable && (
                <div>
                    <label className="block text-sm font-medium text-gray-gray600 dark:text-gray-gray300 mb-1.5">
                        View
                        <span className="text-xs font-normal text-gray-gray400 ml-1">
                            (optional — filters records)
                        </span>
                    </label>
                    <div className="relative">
                        <select
                            value={selectedViewId}
                            onChange={(e) => setSelectedViewId(e.target.value)}
                            className="w-full appearance-none px-3 py-2 pr-8 bg-white dark:bg-gray-gray800 border border-gray-gray200 dark:border-gray-gray600 rounded-md text-sm text-gray-gray700 dark:text-gray-gray200 focus:outline-none focus:ring-2 focus:ring-blue-blue/30 focus:border-blue-blue"
                        >
                            <option value="">All records</option>
                            {selectedTable.views.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.name}
                                </option>
                            ))}
                        </select>
                        <CaretDownIcon
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-gray400 pointer-events-none"
                        />
                    </div>
                </div>
            )}

            {/* Field Mapping */}
            {selectedTable && (
                <div className="flex items-end gap-2">
                    {/* Source Field */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-gray600 dark:text-gray-gray300 mb-1.5">
                            Source (Attachments)
                        </label>
                        <div className="relative">
                            <select
                                value={sourceFieldId}
                                onChange={(e) => setSourceFieldId(e.target.value)}
                                className="w-full appearance-none px-3 py-2 pr-8 bg-white dark:bg-gray-gray800 border border-gray-gray200 dark:border-gray-gray600 rounded-md text-sm text-gray-gray700 dark:text-gray-gray200 focus:outline-none focus:ring-2 focus:ring-blue-blue/30 focus:border-blue-blue"
                            >
                                <option value="">Select field...</option>
                                {attachmentFields.map((f) => (
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
                    </div>

                    <ArrowRightIcon
                        size={18}
                        className="text-gray-gray400 mb-2.5 shrink-0"
                    />

                    {/* Destination Field */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-gray600 dark:text-gray-gray300 mb-1.5">
                            Destination (URL)
                        </label>
                        <div className="relative">
                            <select
                                value={destFieldId}
                                onChange={(e) => setDestFieldId(e.target.value)}
                                className="w-full appearance-none px-3 py-2 pr-8 bg-white dark:bg-gray-gray800 border border-gray-gray200 dark:border-gray-gray600 rounded-md text-sm text-gray-gray700 dark:text-gray-gray200 focus:outline-none focus:ring-2 focus:ring-blue-blue/30 focus:border-blue-blue"
                            >
                                <option value="">Select field...</option>
                                {destFields.map((f) => (
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
                    </div>
                </div>
            )}

            {/* Expiry */}
            <div>
                <label className="block text-sm font-medium text-gray-gray600 dark:text-gray-gray300 mb-1.5">
                    <div className="flex items-center gap-1.5">
                        <CalendarIcon size={13} />
                        Default Expiry
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

            {/* Records count info */}
            {records && selectedTable && sourceFieldId && (
                <div className="px-3 py-2 bg-gray-gray50 dark:bg-gray-gray800 rounded-md text-xs text-gray-gray500 dark:text-gray-gray400">
                    {records.length} records loaded
                    {sourceFieldId && (
                        <>
                            {' · '}
                            {records.filter((r) => {
                                const field = selectedTable.getFieldIfExists(sourceFieldId);
                                if (!field) return false;
                                const val = r.getCellValue(field);
                                return val && Array.isArray(val) && val.length > 0;
                            }).length}{' '}
                            with attachments
                        </>
                    )}
                </div>
            )}

            {/* Convert Button */}
            <button
                onClick={handleConvertAll}
                disabled={!sourceFieldId || !destFieldId || processing || !apiKey}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-purple hover:bg-purple-purpleDark1 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors text-sm"
            >
                {processing ? (
                    <>
                        <SpinnerIcon size={16} className="animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <LightningIcon size={16} weight="fill" />
                        Convert All Attachments
                    </>
                )}
            </button>

            {/* Progress Bar */}
            {(processing || completed) && progress.total > 0 && (
                <div className="space-y-2">
                    {/* Bar */}
                    <div className="w-full bg-gray-gray100 dark:bg-gray-gray600 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${
                                completed && progress.errors.length === 0
                                    ? 'bg-green-green'
                                    : completed && progress.errors.length > 0
                                      ? 'bg-yellow-yellow'
                                      : 'bg-blue-blue'
                            }`}
                            style={{width: `${progressPercent}%`}}
                        />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-gray500 dark:text-gray-gray400">
                        <span>
                            {progress.current} of {progress.total} records
                        </span>
                        <span>{progressPercent}%</span>
                    </div>

                    {/* Completion message */}
                    {completed && (
                        <div
                            className={`flex items-center gap-2 p-3 rounded-md ${
                                progress.errors.length === 0
                                    ? 'bg-green-greenLight3 dark:bg-green-greenDark1/10 border border-green-greenLight1 dark:border-green-greenDark1'
                                    : 'bg-yellow-yellowLight3 dark:bg-yellow-yellowDark1/10 border border-yellow-yellowLight1 dark:border-yellow-yellowDark1'
                            }`}
                        >
                            {progress.errors.length === 0 ? (
                                <CheckCircleIcon
                                    size={16}
                                    weight="fill"
                                    className="text-green-green shrink-0"
                                />
                            ) : (
                                <WarningIcon
                                    size={16}
                                    weight="fill"
                                    className="text-yellow-yellowDark1 dark:text-yellow-yellow shrink-0"
                                />
                            )}
                            <span className="text-sm font-medium text-gray-gray700 dark:text-gray-gray200">
                                Completed!{' '}
                                {progress.errors.length > 0 &&
                                    `(${progress.errors.length} error${progress.errors.length > 1 ? 's' : ''})`}
                            </span>
                        </div>
                    )}

                    {/* Errors */}
                    {progress.errors.length > 0 && (
                        <div className="max-h-32 overflow-y-auto space-y-1">
                            {progress.errors.map((err, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-1.5 text-xs text-red-redDark1 dark:text-red-redLight1"
                                >
                                    <XCircleIcon size={12} className="shrink-0 mt-0.5" />
                                    <span>{err}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

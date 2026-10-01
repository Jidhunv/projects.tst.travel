interface ImportRow {
    rowNumber: number;
    data: Record<string, any>;
    status: 'success' | 'error' | 'duplicate';
    errors: string[];
    isDuplicate: boolean;
    duplicateOf?: string;
}
interface ImportPreviewResult {
    totalRows: number;
    successRows: ImportRow[];
    errorRows: ImportRow[];
    duplicateRows: ImportRow[];
    columnMapping: Record<string, string>;
}
export declare class ImportService {
    private accountRepository;
    private userRepository;
    parseAndValidateImport(filePath: string, columnMapping: Record<string, string>, defaultUserId?: string, originalFilename?: string): Promise<ImportPreviewResult>;
    saveImportedAccounts(rows: ImportRow[], currentUserId?: string, defaultUserId?: string): Promise<{
        savedCount: number;
        failedCount: number;
        errors: {
            rowNumber: number;
            reason: string;
        }[];
    }>;
    private getExistingAccountNames;
}
declare const _default: ImportService;
export default _default;
//# sourceMappingURL=import.service.d.ts.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportService = void 0;
const database_1 = require("../config/database");
const Account_1 = require("../models/Account");
const User_1 = require("../models/User");
const errorHandler_1 = require("../middleware/errorHandler");
const csv = __importStar(require("csv-parse/sync"));
const exceljs_1 = __importDefault(require("exceljs"));
const fs = __importStar(require("fs"));
const logger_1 = __importDefault(require("../utils/logger"));
class ImportService {
    constructor() {
        this.accountRepository = database_1.AppDataSource.getRepository(Account_1.Account);
        this.userRepository = database_1.AppDataSource.getRepository(User_1.User);
    }
    async parseAndValidateImport(filePath, columnMapping, defaultUserId = '', originalFilename = '') {
        let records = [];
        // Detect file type from original filename and parse accordingly
        const isExcel = originalFilename.toLowerCase().endsWith('.xlsx');
        if (isExcel) {
            records = await readFirstSheet(filePath);
        }
        else {
            // Parse CSV file
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            records = csv.parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });
        }
        const successRows = [];
        const errorRows = [];
        const duplicateRows = [];
        const processedNames = new Set();
        const existingNames = await this.getExistingAccountNames();
        records.forEach((record, index) => {
            const rowNumber = index + 2; // +2 because header is row 1
            const mappedData = {};
            const errors = [];
            // Map CSV columns to MIDT fields
            Object.entries(columnMapping).forEach(([csvColumn, miditField]) => {
                if (miditField && record[csvColumn] !== undefined && record[csvColumn] !== '') {
                    mappedData[miditField] = record[csvColumn];
                }
            });
            // Handle ownerId - use mapped value or default
            if (!mappedData.ownerId && defaultUserId) {
                mappedData.ownerId = defaultUserId;
            }
            // Validate required fields
            if (!mappedData.name || mappedData.name.trim() === '') {
                errors.push('Company Name is required');
            }
            // Validate ownerId if provided
            if (mappedData.ownerId && !mappedData.ownerId.match(/^[a-f0-9-]{36}$/i) && !mappedData.ownerId.includes('@')) {
                errors.push('Owner/User must be a valid UUID or email address');
            }
            // Validate type field if provided
            if (mappedData.type && !['Prospect', 'Customer', 'Inactive'].includes(mappedData.type)) {
                errors.push('Type must be Prospect, Customer, or Inactive');
            }
            // Check for duplicates within import
            const name = mappedData.name?.trim().toLowerCase();
            if (name && processedNames.has(name)) {
                duplicateRows.push({
                    rowNumber,
                    data: mappedData,
                    status: 'duplicate',
                    errors: [],
                    isDuplicate: true,
                    duplicateOf: name,
                });
                return;
            }
            // Check for duplicates in existing database
            if (name && existingNames.has(name)) {
                duplicateRows.push({
                    rowNumber,
                    data: mappedData,
                    status: 'duplicate',
                    errors: [],
                    isDuplicate: true,
                    duplicateOf: name,
                });
                return;
            }
            if (name) {
                processedNames.add(name);
            }
            // If there are errors, add to error rows
            if (errors.length > 0) {
                errorRows.push({
                    rowNumber,
                    data: mappedData,
                    status: 'error',
                    errors,
                    isDuplicate: false,
                });
            }
            else {
                successRows.push({
                    rowNumber,
                    data: mappedData,
                    status: 'success',
                    errors: [],
                    isDuplicate: false,
                });
            }
        });
        return {
            totalRows: records.length,
            successRows,
            errorRows,
            duplicateRows,
            columnMapping,
        };
    }
    async saveImportedAccounts(rows, currentUserId, defaultUserId) {
        let savedCount = 0;
        let failedCount = 0;
        const errors = [];
        for (const row of rows) {
            try {
                let ownerId = row.data.ownerId || currentUserId || null;
                // If ownerId looks like an email, look up the user
                if (ownerId && ownerId.includes('@')) {
                    try {
                        const user = await this.userRepository.findOne({
                            where: { email: ownerId },
                        });
                        if (user) {
                            ownerId = user.id;
                        }
                        else {
                            // Unresolvable owner degrades to the importing user rather than
                            // failing the row against the NOT NULL ownerId column.
                            ownerId = currentUserId || null;
                        }
                    }
                    catch (e) {
                        ownerId = currentUserId || null;
                    }
                }
                // Create account with default values
                const accountData = {
                    name: row.data.name,
                    industry: row.data.industry || null,
                    website: row.data.website || null,
                    phoneNumber: row.data.phoneNumber || null,
                    email: row.data.email || null,
                    contactPerson: row.data.contactPerson || null,
                    city: row.data.city || null,
                    region: row.data.region || null,
                    country: row.data.country || null,
                    size: row.data.size || null,
                    type: row.data.type || 'Prospect',
                    status: 'Prospect',
                    tier: row.data.tier || null, // Client tier from MIDT
                };
                if (ownerId) {
                    accountData.ownerId = ownerId;
                }
                // The creator is the wizard's "Assign Default User" selection, so it stays
                // constant even when per-row owners come from a mapped CSV column.
                const creatorId = defaultUserId || ownerId || currentUserId;
                if (creatorId) {
                    accountData.createdBy = creatorId;
                }
                const account = this.accountRepository.create(accountData);
                await this.accountRepository.save(account);
                savedCount++;
            }
            catch (error) {
                failedCount++;
                // 23505 = unique_violation; the raw message is a constraint hash, so name
                // the offending account instead.
                const reason = error?.code === '23505'
                    ? `An account named "${row.data.name}" already exists`
                    : error instanceof Error ? error.message : String(error);
                errors.push({ rowNumber: row.rowNumber, reason });
                logger_1.default.error(`Import row ${row.rowNumber} failed: ${reason}`);
            }
        }
        if (savedCount === 0 && failedCount > 0) {
            throw new errorHandler_1.AppError(400, `All ${failedCount} row(s) failed to save. First error: ${errors[0].reason}`);
        }
        return { savedCount, failedCount, errors };
    }
    async getExistingAccountNames() {
        const accounts = await this.accountRepository.find();
        return new Set(accounts.map(a => a.name.toLowerCase()));
    }
}
exports.ImportService = ImportService;
exports.default = new ImportService();
// First worksheet of an .xlsx file as records keyed by the header row. Cell values
// are read as text, so formulas and rich text cannot inject objects into the import.
async function readFirstSheet(filePath) {
    const workbook = new exceljs_1.default.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet)
        return [];
    const headers = [];
    const records = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values = row.values; // index 0 is unused by exceljs
        if (rowNumber === 1) {
            for (let c = 1; c < values.length; c++)
                headers[c - 1] = String(values[c] ?? '').trim();
            return;
        }
        const record = {};
        headers.forEach((h, i) => {
            if (!h)
                return;
            const v = values[i + 1];
            record[h] = v === null || v === undefined ? '' : cellText(v);
        });
        records.push(record);
    });
    return records;
}
function cellText(v) {
    if (v instanceof Date)
        return v.toISOString().slice(0, 10);
    if (typeof v === 'object') {
        if (Array.isArray(v.richText))
            return v.richText.map((t) => t.text).join('');
        if (v.text !== undefined)
            return String(v.text);
        if (v.result !== undefined)
            return String(v.result ?? '');
        return '';
    }
    return String(v);
}
//# sourceMappingURL=import.service.js.map
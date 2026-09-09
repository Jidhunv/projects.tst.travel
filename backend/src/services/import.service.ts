import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import * as csv from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

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

export class ImportService {
  private accountRepository = AppDataSource.getRepository(Account);
  private userRepository = AppDataSource.getRepository(User);

  async parseAndValidateImport(
    filePath: string,
    columnMapping: Record<string, string>,
    defaultUserId: string = ''
  ): Promise<ImportPreviewResult> {
    let records: Record<string, any>[] = [];

    // Detect file type and parse accordingly
    if (filePath.toLowerCase().endsWith('.xlsx') || filePath.toLowerCase().endsWith('.xls')) {
      // Parse Excel file
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      records = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
      // Parse CSV file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    }

    const successRows: ImportRow[] = [];
    const errorRows: ImportRow[] = [];
    const duplicateRows: ImportRow[] = [];
    const processedNames = new Set<string>();
    const existingNames = await this.getExistingAccountNames();

    records.forEach((record: Record<string, any>, index: number) => {
      const rowNumber = index + 2; // +2 because header is row 1
      const mappedData: Record<string, any> = {};
      const errors: string[] = [];

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
      } else {
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

  async saveImportedAccounts(rows: ImportRow[]): Promise<{ savedCount: number; failedCount: number }> {
    let savedCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      try {
        let ownerId = row.data.ownerId || 'system';

        // If ownerId looks like an email, look up the user
        if (ownerId && ownerId.includes('@')) {
          try {
            const user = await this.userRepository.findOne({
              where: { email: ownerId },
            });
            if (user) {
              ownerId = user.id;
            } else {
              // User not found, fall back to system
              ownerId = 'system';
            }
          } catch (e) {
            // If lookup fails, use system
            ownerId = 'system';
          }
        }

        // Create account with default values
        const account = this.accountRepository.create({
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
          ownerId: ownerId,
        });

        await this.accountRepository.save(account);
        savedCount++;
      } catch (error) {
        failedCount++;
        console.error(`Failed to save account from row ${row.rowNumber}:`, error);
      }
    }

    return { savedCount, failedCount };
  }

  private async getExistingAccountNames(): Promise<Set<string>> {
    const accounts = await this.accountRepository.find();
    return new Set(accounts.map(a => a.name.toLowerCase()));
  }
}

export default new ImportService();

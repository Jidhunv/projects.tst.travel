"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureQuestionBank = ensureQuestionBank;
const database_1 = require("../config/database");
const questionnaire_1 = require("../utils/questionnaire");
const logger_1 = __importDefault(require("../utils/logger"));
// The question master lives in the `questions` table. The built-in list in utils/questionnaire.ts is
// only the starting set: it is copied in once, and never overwrites a row that someone has since edited.
async function ensureQuestionBank() {
    try {
        await database_1.AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        await database_1.AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "questionKey" VARCHAR(32) NOT NULL UNIQUE,
        stage VARCHAR(40) NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        text TEXT NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'text',
        mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        options JSONB NULL,
        help TEXT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
        await database_1.AppDataSource.query('CREATE INDEX IF NOT EXISTS idx_questions_stage ON questions(stage, position)');
        const stageOrder = new Map();
        for (const q of questionnaire_1.QUESTIONS) {
            const pos = (stageOrder.get(q.stage) ?? 0) + 1;
            stageOrder.set(q.stage, pos);
            const inserted = await database_1.AppDataSource.query(`INSERT INTO questions ("questionKey", stage, position, text, type, mandatory, options, help)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT ("questionKey") DO NOTHING RETURNING id`, [q.key, q.stage, pos, q.text, q.type, q.mandatory, q.options ? JSON.stringify(q.options) : null, q.help || null]);
            if (inserted.length)
                logger_1.default.info(`Question bank: added ${q.key}`);
        }
    }
    catch (error) {
        logger_1.default.error('ensureQuestionBank failed:', error);
    }
}
//# sourceMappingURL=questionBank.service.js.map
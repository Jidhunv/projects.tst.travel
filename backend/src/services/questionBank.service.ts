import { AppDataSource } from '../config/database';
import { QUESTIONS } from '../utils/questionnaire';
import logger from '../utils/logger';

// The question master lives in the `questions` table. The built-in list in utils/questionnaire.ts is
// only the starting set: it is copied in once, and never overwrites a row that someone has since edited.
export async function ensureQuestionBank(): Promise<void> {
  try {
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await AppDataSource.query(`
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
    await AppDataSource.query('CREATE INDEX IF NOT EXISTS idx_questions_stage ON questions(stage, position)');
    const stageOrder = new Map<string, number>();
    for (const q of QUESTIONS) {
      const pos = (stageOrder.get(q.stage) ?? 0) + 1;
      stageOrder.set(q.stage, pos);
      const inserted = await AppDataSource.query(
        `INSERT INTO questions ("questionKey", stage, position, text, type, mandatory, options, help)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT ("questionKey") DO NOTHING RETURNING id`,
        [q.key, q.stage, pos, q.text, q.type, q.mandatory, q.options ? JSON.stringify(q.options) : null, q.help || null]
      );
      if (inserted.length) logger.info(`Question bank: added ${q.key}`);
    }
  } catch (error) {
    logger.error('ensureQuestionBank failed:', error);
  }
}

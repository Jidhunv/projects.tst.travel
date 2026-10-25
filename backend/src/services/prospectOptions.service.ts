import { AppDataSource } from '../config/database';
import { ProspectOptionSets, ProspectOptionCategory, PROSPECT_OPTION_CATEGORIES } from '../utils/prospecting';

// Active options per category. Read on every questionnaire save and list, so a change
// in the master takes effect at once.
export async function activeProspectOptions(): Promise<ProspectOptionSets> {
  const rows: Array<{ category: ProspectOptionCategory; name: string }> = await AppDataSource.query(
    `SELECT category, name FROM prospect_options WHERE "isActive" = TRUE ORDER BY name`
  );
  const sets: ProspectOptionSets = { businessType: [], employeeBand: [] };
  for (const r of rows) {
    if (r.category === 'businessType') sets.businessType.push(r.name);
    else if (r.category === 'employeeBand') sets.employeeBand.push(r.name);
  }
  return sets;
}

export function isProspectOptionCategory(v: unknown): v is ProspectOptionCategory {
  return (PROSPECT_OPTION_CATEGORIES as readonly string[]).includes(v as string);
}

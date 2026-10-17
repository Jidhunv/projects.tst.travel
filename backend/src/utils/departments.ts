// The functions a role or person can belong to. A person works in one or more.
export const DEPARTMENTS = ['Sales', 'Operations', 'Development', 'Finance', 'Support'] as const;
export type Department = (typeof DEPARTMENTS)[number];

// Only Development staff can be assigned issues.
export const ASSIGNABLE_DEPARTMENT: Department = 'Development';

// Validates a list from a request body. Returns the cleaned list, or throws a message.
export function cleanDepartments(input: unknown): Department[] {
  if (input === undefined || input === null || input === '') return [];
  if (!Array.isArray(input)) throw new Error('Departments must be a list');
  const out: Department[] = [];
  for (const d of input) {
    if (!(DEPARTMENTS as readonly string[]).includes(d)) throw new Error(`Unknown department: ${String(d)}. Choose from ${DEPARTMENTS.join(', ')}`);
    if (!out.includes(d as Department)) out.push(d as Department);
  }
  return out;
}

// A person's own departments if any were set, otherwise their role's.
export const effectiveDepartments = (own?: string[] | null, fromRole?: string[] | null): string[] =>
  own && own.length ? own : fromRole || [];

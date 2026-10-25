// Sorting for list screens. The client sends a key and a direction; only keys in the
// resource's whitelist reach the query, so no user text is ever put into an ORDER BY.

export type SortDir = 'ASC' | 'DESC';

// Maps each allowed sort key to the query-builder column it sorts by, e.g. name -> 'account.name'.
export type SortMap = Record<string, string>;

// Returns the column and direction for a list. With no valid sortBy, the fallback key is used.
// A given sortBy defaults to ascending unless sortDir says desc.
export function resolveSort(
  sortBy: unknown,
  sortDir: unknown,
  allowed: SortMap,
  fallbackKey: string,
  fallbackDir: SortDir = 'DESC'
): { column: string; dir: SortDir } {
  if (typeof sortBy === 'string' && allowed[sortBy]) {
    const dir: SortDir = sortDir === 'desc' ? 'DESC' : 'ASC';
    return { column: allowed[sortBy], dir };
  }
  return { column: allowed[fallbackKey], dir: fallbackDir };
}
